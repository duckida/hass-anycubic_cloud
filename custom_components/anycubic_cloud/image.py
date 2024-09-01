"""Support for Anycubic Cloud image."""
from __future__ import annotations

from homeassistant.components.image import (
    Image,
    ImageEntity,
    ImageEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    CONF_PRINTER_ID_LIST,
    COORDINATOR,
    DOMAIN,
)
from .coordinator import AnycubicCloudDataUpdateCoordinator
from .entity import AnycubicCloudEntity
from .helpers import printer_entity_unique_id, printer_state_for_key


IMAGE_TYPES = (
    ImageEntityDescription(
        key="current_project_image_url",
        translation_key="current_project_image_url",
    ),
)

GLOBAL_IMAGE_TYPES = (
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the image from a config entry."""

    coordinator: AnycubicCloudDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id][
        COORDINATOR
    ]

    entity_list = list()

    for printer_id in entry.data[CONF_PRINTER_ID_LIST]:
        for description in IMAGE_TYPES:
            entity_list.append(AnycubicCloudImage(
                hass,
                coordinator,
                printer_id,
                description,
            ))

    for description in GLOBAL_IMAGE_TYPES:
        entity_list.append(AnycubicCloudImage(
            hass,
            coordinator,
            entry.data[CONF_PRINTER_ID_LIST][0],
            description,
        ))

    async_add_entities(entity_list)


class AnycubicCloudImage(AnycubicCloudEntity, ImageEntity):
    """An image for Anycubic Cloud."""

    entity_description: ImageEntityDescription

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: AnycubicCloudDataUpdateCoordinator,
        printer_id: int,
        description: ImageEntityDescription,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, printer_id)
        ImageEntity.__init__(self, hass)
        self.entity_description = description
        self._attr_unique_id = printer_entity_unique_id(coordinator, self._printer_id, description.key)
        self._known_image_url = None

    def reset_cached_image(self):
        self._cached_image = None

    @property
    def image_url(self) -> str | None:
        image_url = printer_state_for_key(self.coordinator, self._printer_id, self.entity_description.key)
        if self._known_image_url != image_url:
            self.reset_cached_image()

        self._known_image_url = image_url

        return self._known_image_url

    async def _async_load_image_from_url(self, url: str) -> Image | None:
        """Load an image by url."""
        if response := await self._fetch_url(url):
            return Image(
                content=response.content,
                content_type="image/png",
            )
        return None
