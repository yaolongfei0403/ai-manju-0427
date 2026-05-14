"""Tests for VolcTTSService using httpx AsyncMock."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.core.model_config.services.tts_service import VolcTTSService
from backend.app.core.model_config.types import ModelConfigEntry


@pytest.fixture
def tts_entry():
    return ModelConfigEntry(
        provider="volc",
        model="seed-tts",
        api_key="test-key",
        endpoint="https://volc-stream.volcapi.com/v1",
        timeout=60.0,
        extra={"voice": "zh-CN-Female", "speed": 1.0},
    )


@pytest.fixture
def mock_audio_api_response():
    return {"code": 200, "data": [{"audio_url": "https://example.com/audio.mp3"}]}


@pytest.mark.asyncio
async def test_volc_tts_generate_success(tts_entry, mock_audio_api_response, tmp_path, monkeypatch):
    monkeypatch.setenv("FILE_STORAGE_PATH", str(tmp_path))
    service = VolcTTSService(tts_entry)

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = AsyncMock(return_value=mock_audio_api_response)
    mock_response.content = b"fake-audio-bytes"
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("backend.app.core.model_config.services.tts_service.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value = mock_client
        result = await service.generate("hello world")

    assert result.startswith("/uploads/assets/")
    assert result.endswith(".mp3")


@pytest.mark.asyncio
async def test_volc_tts_respects_extra_params(tts_entry, mock_audio_api_response, tmp_path, monkeypatch):
    monkeypatch.setenv("FILE_STORAGE_PATH", str(tmp_path))
    service = VolcTTSService(tts_entry)

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = AsyncMock(return_value=mock_audio_api_response)
    mock_response.content = b"fake-audio-bytes"
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("backend.app.core.model_config.services.tts_service.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value = mock_client
        result = await service.generate("Hello", voice="zh-CN-Male", speed=1.5)

    assert result.endswith(".mp3")