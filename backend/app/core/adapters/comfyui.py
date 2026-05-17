"""
ComfyUI adapter — supports workflow-based image/video generation.
"""

import asyncio
import json
from typing import Any, AsyncIterator, AsyncIterator
import httpx
from jinja2 import Template
from .base import ModelAdapter, TaskFailedException, TaskTimeoutException


class ComfyuiAdapter(ModelAdapter):
    """
    Adapter for ComfyUI workflow engine.

    Handles:
    - Image generation via workflow
    - Video generation via workflow
    - WebSocket progress streaming
    - File auto-transfer to MinIO
    """

    def build_headers(self) -> dict[str, str]:
        headers = super().build_headers()
        headers["X-API-Key"] = self.api_key
        return headers

    def convert_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Convert unified request to ComfyUI prompt format.

        Expected params:
            prompt: str (positive prompt)
            negative_prompt: str (optional)
            seed: int (optional, default 0)
            steps: int (optional, default 20)
            cfg: float (optional, default 8.0)
            sampler_name: str (optional, default "euler")
            scheduler: str (optional, default "normal")
            denoise: float (optional, default 1.0)
            checkpoint: str (optional, default "sd_xl_base_1.0.safetensors")
            width: int (optional, default 1024)
            height: int (optional, default 1024)
            image_url: str (optional, for I2V)
        """
        params_schema = self.config.get("paramsSchema") or {}
        workflow_template = params_schema.get("workflowTemplate")
        request_template = params_schema.get("requestTemplate")

        if workflow_template:
            template = Template(str(workflow_template))
            rendered = template.render(**params)
            workflow = json.loads(rendered)
        else:
            # Build default SD workflow
            workflow = self._build_default_workflow(params)

        if request_template:
            template = Template(str(request_template))
            rendered = template.render(workflowTemplate=workflow)
            return json.loads(rendered)

        return {"prompt": workflow}

    def _build_default_workflow(self, params: dict[str, Any]) -> dict[str, Any]:
        """Build a default Stable Diffusion workflow."""
        return {
            "1": {
                "inputs": {
                    "text": params.get("prompt", ""),
                    "clip": ["4", 1],
                },
                "class_type": "CLIPTextEncode",
            },
            "3": {
                "inputs": {
                    "seed": params.get("seed", 0),
                    "steps": params.get("steps", 20),
                    "cfg": params.get("cfg", 8.0),
                    "sampler_name": params.get("sampler_name", "euler"),
                    "scheduler": params.get("scheduler", "normal"),
                    "denoise": params.get("denoise", 1.0),
                    "model": ["4", 0],
                    "positive": ["1", 0],
                    "negative": ["6", 0],
                    "latent_image": ["5", 0],
                },
                "class_type": "KSampler",
            },
            "4": {
                "inputs": {
                    "ckpt_name": params.get("checkpoint", "sd_xl_base_1.0.safetensors"),
                },
                "class_type": "CheckpointLoaderSimple",
            },
            "5": {
                "inputs": {
                    "width": params.get("width", 1024),
                    "height": params.get("height", 1024),
                    "batch_size": 1,
                },
                "class_type": "EmptyLatentImage",
            },
            "6": {
                "inputs": {
                    "text": params.get("negative_prompt", "text, watermark"),
                    "clip": ["4", 1],
                },
                "class_type": "CLIPTextEncode",
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": ["8", 0],
                },
                "class_type": "SaveImage",
            },
        }

    def parse_response(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse ComfyUI response."""
        return {
            "prompt_id": raw_response.get("prompt_id", ""),
            "status": raw_response.get("status", "UNKNOWN"),
        }

    async def poll_task(self, prompt_id: str) -> dict[str, Any]:
        """Poll ComfyUI history endpoint for completion."""
        params_schema = self.config.get("paramsSchema") or {}
        polling = params_schema.get("polling", {})
        interval_ms = polling.get("intervalMs", 1500)
        max_attempts = polling.get("maxAttempts", 200)
        endpoint = self.config.get("endpoint", "").rstrip("/")

        poll_url = f"{endpoint}/history/{prompt_id}"
        headers = self.build_headers()

        for attempt in range(max_attempts):
            async with self.http.get(poll_url, headers=headers) as resp:
                if resp.status_code == 200:
                    data = resp.json()
                    if prompt_id in data:
                        return self._extract_outputs(data[prompt_id])

                await asyncio.sleep(interval_ms / 1000)

        raise TaskTimeoutException(prompt_id)

    def _extract_outputs(self, node_data: dict[str, Any]) -> dict[str, Any]:
        """Extract output files from completed workflow."""
        outputs = node_data.get("outputs", {})
        all_media = []

        for node_id, node_output in outputs.items():
            for media_type in ["images", "gifs", "3ds"]:
                if media_type in node_output:
                    for media in node_output[media_type]:
                        all_media.append({
                            "node_id": node_id,
                            "type": media_type,
                            "filename": media["filename"],
                            "subfolder": media.get("subfolder", ""),
                        })

        return {
            "status": "succeeded",
            "media": all_media,
            "prompt_id": node_data.get("prompt_id", ""),
        }

    async def submit_task(self, request: dict[str, Any]) -> str:
        """Submit prompt to ComfyUI queue."""
        headers = self.build_headers()
        async with self.http.post(
            f"{self.endpoint}/prompt",
            json=request,
            headers=headers,
        ) as resp:
            data = resp.json()
            if resp.status_code != 200:
                raise AdapterError(f"ComfyUI submit failed: {data}")
            return data.get("prompt_id", "")

    async def generate(self, params: dict[str, Any]) -> dict[str, Any]:
        """Full pipeline: submit -> poll -> parse."""
        request = self.convert_request(params)
        prompt_id = await self.submit_task(request)
        return await self.poll_task(prompt_id)

    async def handle_websocket(
        self,
        ws_url: str,
        client_id: str,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Handle WebSocket connection for real-time progress.
        Yields progress events as they arrive.
        """
        import websockets  # type: ignore

        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps({"client_id": client_id}))
            async for message in ws:
                data = json.loads(message)
                yield data