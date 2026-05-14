# T2I Service - Text-to-Image generation services
# Supports Wan2.6/Wan2.7 (Aliyun dashscope) and ComfyUI

import os
import uuid
import httpx
from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime

# File storage path for generated images
FILE_STORAGE_PATH = os.getenv("FILE_STORAGE_PATH", "./uploads")
ASSETS_DIR = os.path.join(FILE_STORAGE_PATH, "assets")


class BaseT2IService(ABC):
    """T2I Service 基类"""

    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> str:
        """
        生成图片并返回本地存储路径
        Returns: 本地文件路径 (e.g. /uploads/assets/{uuid}.png)
        """
        raise NotImplementedError


class Wan26T2IService(BaseT2IService):
    """万相 2.6/2.7 文生图服务 (dashscope SDK)"""

    def __init__(self, api_key: str, model_name: str = "wan2.7-image"):
        self.api_key = api_key
        self.model_name = model_name
        self._ensure_assets_dir()

    def _ensure_assets_dir(self):
        os.makedirs(ASSETS_DIR, exist_ok=True)

    async def generate(self, prompt: str, **kwargs) -> str:
        """
        使用 dashscope SDK 生成图片

        Args:
            prompt: 图片生成提示词
            size: 图片尺寸 (default "2K", also "1024x1024", "1536x1536", etc.)
            n: 生成数量 (default 1)
            enable_sequential: 是否顺序返回多张 (default False)

        Returns:
            本地文件路径
        """
        import dashscope
        from dashscope.aigc.image_generation import ImageGeneration
        from dashscope.api_entities.dashscope_response import Message

        size = kwargs.get("size", "2K")
        n = kwargs.get("n", 1)
        enable_sequential = kwargs.get("enable_sequential", False)

        dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"

        message = Message(
            role="user",
            content=[
                {"text": prompt}
            ]
        )

        response = ImageGeneration.call(
            model=self.model_name,
            api_key=self.api_key,
            messages=[message],
            enable_sequential=enable_sequential,
            n=n,
            size=size,
        )

        if response.status_code != 200:
            raise Exception(f"Wan2.7 API error: {response.code} - {response.message}")

        # 下载图片
        image_urls = []
        if hasattr(response, "output") and response.output:
            if hasattr(response.output, "results") and response.output.results:
                for result in response.output.results:
                    if hasattr(result, "image_url"):
                        image_urls.append(result.image_url)
            elif hasattr(response.output, "images"):
                for img in response.output.images or []:
                    if isinstance(img, str):
                        image_urls.append(img)

        if not image_urls:
            # 可能是同步直接返回的image_url
            if hasattr(response, "output") and hasattr(response.output, "image_url"):
                image_urls = [response.output.image_url]

        if not image_urls:
            raise Exception(f"No image URLs in Wan2.7 response: {response}")

        # 只取第一张
        image_url = image_urls[0]
        local_path = await self._download_and_save(image_url)
        return local_path

    async def _download_and_save(self, url: str) -> str:
        """下载图片并保存到本地"""
        db_id = str(uuid.uuid4())
        file_name = f"{db_id}.png"
        file_path = os.path.join(ASSETS_DIR, file_name)

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            with open(file_path, "wb") as f:
                f.write(response.content)

        # 返回相对路径 (用于 URL 构建)
        return f"/uploads/assets/{file_name}"


class ComfyUIT2IService(BaseT2IService):
    """ComfyUI 文生图服务"""

    def __init__(self, endpoint: str, api_key: Optional[str] = None, workflow_template: Optional[str] = None):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key
        self.workflow_template = workflow_template or self._default_workflow()
        self._ensure_assets_dir()

    def _ensure_assets_dir(self):
        os.makedirs(ASSETS_DIR, exist_ok=True)

    def _default_workflow(self) -> str:
        """
        默认 ComfyUI 工作流模板 (简化版 txt2img)
        实际使用时可能需要根据具体 ComfyUI 节点配置调整
        """
        return """{
    "3": {"inputs": {"text": "negative prompt", "type": "TEXT"}, "class_type": "CLIPTextEncode"},
    "4": {"inputs": {"width": 1024, "height": 1024, "batch_size": 1}, "class_type": "EmptyLatentImage"},
    "5": {"inputs": {"prompt": "", "clip": ["6", 1]}, "class_type": "CLIPTextEncode"},
    "6": {"inputs": {"model": "model_name", "clip": ["6", 1]}, "class_type": "KSampler"},
    "7": {"inputs": {"samples": ["6", 0], "vae": ["6", 2]}, "class_type": "VAEDecode"},
    "8": {"inputs": {"images": ["7", 0], "filename_prefix": "asset", "type": "output"} , "class_type": "SaveImage"}
}"""

    async def generate(self, prompt: str, **kwargs) -> str:
        """
        调用 ComfyUI API 生成图片

        Args:
            prompt: 图片生成提示词
            negative_prompt: 负面提示词 (可选)
            width/height: 图片尺寸 (default 1024x1024)
            steps: 采样步数 (default 20)
            cfg: CFG scale (default 7.0)

        Returns:
            本地文件路径
        """
        width = kwargs.get("width", 1024)
        height = kwargs.get("height", 1024)
        steps = kwargs.get("steps", 20)
        cfg = kwargs.get("cfg", 7.0)
        negative_prompt = kwargs.get("negative_prompt", "")

        # 构建请求头
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # 构建 prompt 字段 (简化版，实际按 ComfyUI workflow 结构)
        prompt_data = self.workflow_template
        prompt_data = prompt_data.replace('"prompt": ""', f'"prompt": "{prompt}"')
        prompt_data = prompt_data.replace('"negative prompt"', f'"{negative_prompt}"')
        prompt_data = prompt_data.replace('"width": 1024', f'"width": {width}')
        prompt_data = prompt_data.replace('"height": 1024', f'"height": {height}')

        # 调用 ComfyUI prompt API
        async with httpx.AsyncClient(timeout=120.0) as client:
            # 尝试新版 /v1/image/generation
            try:
                response = await client.post(
                    f"{self.endpoint}/v1/image/generation",
                    headers=headers,
                    json={
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "width": width,
                        "height": height,
                        "steps": steps,
                        "cfg": cfg,
                    }
                )
            except Exception:
                # fallback 到旧版 /sdapi/v1/txt2img
                response = await client.post(
                    f"{self.endpoint}/sdapi/v1/txt2img",
                    headers=headers,
                    json={
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "width": width,
                        "height": height,
                        "steps": steps,
                        "cfg_scale": cfg,
                    }
                )

            if response.status_code != 200:
                raise Exception(f"ComfyUI API error: {response.status_code} - {response.text}")

            result = response.json()

            # 解析返回的图片 (可能是 base64 或 URL)
            image_data = None
            if "images" in result and result["images"]:
                image_data = result["images"][0]
            elif "image" in result:
                image_data = result["image"]
            elif "output" in result and "image" in result["output"]:
                image_data = result["output"]["image"]

            if not image_data:
                raise Exception(f"No image data in ComfyUI response: {result}")

            # 保存图片
            db_id = str(uuid.uuid4())
            file_name = f"{db_id}.png"
            file_path = os.path.join(ASSETS_DIR, file_name)

            # 如果是 base64，解码后保存
            import base64
            if isinstance(image_data, str) and len(image_data) > 100:
                # 可能是 base64
                try:
                    img_bytes = base64.b64decode(image_data)
                except Exception:
                    # 可能是 URL，直接下载
                    img_response = await client.get(image_data)
                    img_bytes = img_response.content
            else:
                # 可能是 URL
                img_response = await client.get(image_data)
                img_bytes = img_response.content

            with open(file_path, "wb") as f:
                f.write(img_bytes)

            return f"/uploads/assets/{file_name}"


def create_t2i_service(provider: str, api_key: str, endpoint: str, model_name: str) -> BaseT2IService:
    """
    工厂函数：根据 provider 创建对应的 T2I 服务

    Args:
        provider: 提供商标识 (wan2.6-t2i, wan2.7-image, comfyui)
        api_key: API 密钥
        endpoint: API 端点
        model_name: 模型名称

    Returns:
        T2I Service 实例
    """
    provider_lower = provider.lower()

    print(f"[create_t2i_service] provider={provider}, model_name={model_name}, endpoint={endpoint}")

    # wan2.6-t2i / wan2.7-image 都用 dashscope
    if provider_lower in ["wan2.6-t2i", "wan2.7-image", "aliyun", "dashscope"]:
        model = model_name or "wan2.7-image"
        return Wan26T2IService(api_key=api_key, model_name=model)

    # ComfyUI
    if provider_lower in ["comfyui", "comfy"]:
        return ComfyUIT2IService(endpoint=endpoint, api_key=api_key)

    # 默认使用 ComfyUI 格式 (兼容未知 provider)
    return ComfyUIT2IService(endpoint=endpoint, api_key=api_key)