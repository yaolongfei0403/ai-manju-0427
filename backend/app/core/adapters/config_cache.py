"""
Config Cache Service — Redis Pub/Sub for hot config updates.
"""

import asyncio
import json
from typing import Any, Callable
import redis.asyncio as redis


class ConfigCacheService:
    """
    Redis-based config cache with Pub/Sub hot-update support.

    When config changes in DB, publishes to Redis channel.
    Subscribers receive updates without restarting the service.
    """

    CHANNEL = "model_config:changes"

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self._client: redis.Redis | None = None
        self._pubsub: redis.client.PubSub | None = None
        self._subscribers: list[Callable[[dict[str, Any]], None]] = []
        self._listener_task: asyncio.Task | None = None

    async def connect(self):
        """Connect to Redis."""
        if self._client is None:
            self._client = redis.from_url(self.redis_url, decode_responses=True)
            self._pubsub = self._client.pubsub()
            await self._pubsub.subscribe(self.CHANNEL)

    async def disconnect(self):
        """Disconnect from Redis."""
        if self._listener_task:
            self._listener_task.cancel()
            self._listener_task = None
        if self._pubsub:
            await self._pubsub.unsubscribe(self.CHANNEL)
            await self._pubsub.close()
            self._pubsub = None
        if self._client:
            await self._client.close()
            self._client = None

    async def publish_config_change(self, model_id: str, action: str, config: dict[str, Any]):
        """
        Publish a config change event.

        Args:
            model_id: The model config ID that changed
            action: "create" | "update" | "delete"
            config: The full config data
        """
        if self._client is None:
            await self.connect()

        message = {
            "model_id": model_id,
            "action": action,
            "config": config,
        }
        await self._client.publish(self.CHANNEL, json.dumps(message))

    def subscribe(self, callback: Callable[[dict[str, Any]], None]):
        """
        Subscribe to config change events.

        Args:
            callback: Function to call when config changes
        """
        self._subscribers.append(callback)

    async def _on_message(self, message: dict[str, Any]):
        """Handle incoming message."""
        data = json.loads(message["data"])
        for callback in self._subscribers:
            try:
                callback(data)
            except Exception:
                pass

    async def start_listener(self):
        """Start listening for config change events."""
        if self._pubsub is None:
            await self.connect()

        async def listener():
            async for message in self._pubsub.listen():
                if message["type"] == "message":
                    await self._on_message(message)

        self._listener_task = asyncio.create_task(listener())

    async def get_cached_config(self, model_id: str) -> dict[str, Any] | None:
        """Get cached config for a model."""
        if self._client is None:
            await self.connect()
        key = f"model_config:{model_id}"
        data = await self._client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_cached_config(self, model_id: str, config: dict[str, Any], ttl: int = 3600):
        """Cache a model config."""
        if self._client is None:
            await self.connect()
        key = f"model_config:{model_id}"
        await self._client.setex(key, ttl, json.dumps(config))

    async def invalidate(self, model_id: str):
        """Invalidate cached config for a model."""
        if self._client is None:
            await self.connect()
        key = f"model_config:{model_id}"
        await self._client.delete(key)
        await self.publish_config_change(model_id, "invalidate", {})