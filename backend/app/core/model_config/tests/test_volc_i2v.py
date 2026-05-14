"""Tests for WanxI2VService and VolcI2VService using httpx AsyncMock."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.core.model_config.services.i2v_service import WanxI2VService, VolcI2VService
from backend.app.core.model_config.types import ModelConfigEntry


@pytest.fixture
def wanx_entry():
    return ModelConfigEntry(
        provider="wanx",
        model="wan2.7-i2v",
        api_key="test-key",
        endpoint="https://dashscope-intl.aliyuncs.com/api/v1",
        timeout=120.0,
        extra={"duration": "5s", "resolution": "720p"},
    )


@pytest.fixture
def volc_i2v_entry():
    return ModelConfigEntry(
        provider="volc",
        model="seedance-2.0",
        api_key="test-key",
        endpoint="https://visual.volc.com/api/v1",
        timeout=120.0,
        extra={"duration": "5s", "motion_intensity": 0.5},
    )


@pytest.fixture
def mock_video_api_response():
    return {"code": 200, "data": [{"video_url": "https://example.com/video.mp4"}]}


@pytest.mark.asyncio
async def test_wanx_i2v_generate_success(wanx_entry, mock_video_api_response, tmp_path, monkeypatch):
    monkeypatch.setenv("FILE_STORAGE_PATH", str(tmp_path))
    service = WanxI2VService(wanx_entry)

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = AsyncMock(return_value=mock_video_api_response)
    mock_response.content = b"fake-video-bytes"
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("backend.app.core.model_config.services.i2v_service.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value = mock_client
        result = await service.generate("a hero walking", "uploads/assets/test.png")

    assert result.startswith("/uploads/assets/")
    assert result.endswith(".mp4")


@pytest.mark.asyncio
async def test_volc_i2v_generate_success(volc_i2v_entry, mock_video_api_response, tmp_path, monkeypatch):
    monkeypatch.setenv("FILE_STORAGE_PATH", str(tmp_path))
    service = VolcI2VService(volc_i2v_entry)

    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = AsyncMock(return_value=mock_video_api_response)
    mock_response.content = b"fake-video-bytes"
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("backend.app.core.model_config.services.i2v_service.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value = mock_client
        result = await service.generate("a hero walking", "uploads/assets/test.png")

    assert result.startswith("/uploads/assets/")
    assert result.endswith(".mp4")


@pytest.mark.asyncio
async def test_volc_i2v_raises_on_error(volc_i2v_entry, tmp_path, monkeypatch):
    monkeypatch.setenv("FILE_STORAGE_PATH", str(tmp_path))
    service = VolcI2VService(volc_i2v_entry)

    error_response = AsyncMock()
    error_response.status_code = 500
    error_response.text = "Internal Server Error"

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=error_response)

    with patch("backend.app.core.model_config.services.i2v_service.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value = mock_client
        with pytest.raises(RuntimeError) as exc:
            await service.generate("prompt", "uploads/assets/test.png")
    assert "500" in str(exc.value)