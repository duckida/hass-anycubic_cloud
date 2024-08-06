import { LitElement, html, css, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { styleMap } from "lit-html/directives/style-map.js";
import { animate } from "@lit-labs/motion";

import { customElementIfUndef } from "../../../internal/register-custom-element";

import { platform } from "../../../const";

import {
  getPrinterSensorStateObj,
  speedModesFromStateObj,
} from "../../../helpers";

import {
  HomeAssistant,
  HassEntityInfos,
  HassDevice,
  SelectDropdownProps,
} from "../../../types";

import { commonModalStyle } from "../../ui/modal-styles";

import "../../ui/select-dropdown.ts";

const animOptionsCard = {
  keyframeOptions: {
    duration: 250,
    direction: "alternate",
    easing: "ease-in-out",
  },
  properties: ["height", "opacity", "scale"],
};

@customElementIfUndef("anycubic-printercard-printsettings_modal")
export class AnycubicPrintercardPrintsettingsModal extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property()
  public selectedPrinterDevice: HassDevice | undefined;

  @property()
  public printerEntities: HassEntityInfos;

  @property()
  public printerEntityIdPart: string | undefined;

  @state()
  private availableSpeedModes: SelectDropdownProps[] = [];

  @state()
  private currentSpeedModeKey: number = 0;

  @state()
  private currentSpeedModeDescr: string | undefined = undefined;

  @state()
  private _userEditSpeedMode: boolean = false;

  @state()
  private currentFanSpeed: number = 0;

  @state()
  private _userEditFanSpeed: boolean = false;

  @state()
  private currentAuxFanSpeed: number = 0;

  @state()
  private _userEditAuxFanSpeed: boolean = false;

  @state()
  private currentBoxFanSpeed: number = 0;

  @state()
  private _userEditBoxFanSpeed: boolean = false;

  @state()
  private currentTargetTempNozzle: number = 0;

  @state()
  private minTargetTempNozzle: number = 0;

  @state()
  private maxTargetTempNozzle: number = 0;

  @state()
  private _userEditTargetTempNozzle: boolean = false;

  @state()
  private currentTargetTempHotbed: number = 0;

  @state()
  private minTargetTempHotbed: number = 0;

  @state()
  private maxTargetTempHotbed: number = 0;

  @state()
  private _userEditTargetTempHotbed: boolean = false;

  @state()
  private _isOpen: boolean = false;

  async firstUpdated(): void {
    window.addEventListener("ac-printset-modal", (e) => {
      this._handleModalEvent(e);
    });
    window.addEventListener("ac-select-dropdown", (e) => {
      this._handleDropdownEvent(e);
    });
    this.addEventListener("click", (e) => {
      this._closeModal(e);
    });
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (
      changedProperties.has("hass") ||
      changedProperties.has("printerEntities") ||
      changedProperties.has("printerEntityIdPart")
    ) {
      if (!this._userEditFanSpeed) {
        this.currentFanSpeed = getPrinterSensorStateObj(
          this.hass,
          this.printerEntities,
          this.printerEntityIdPart,
          "fan_speed",
          0,
        ).state;
      }
      if (!this._userEditTargetTempNozzle) {
        const currentTargetTempNozzleState = getPrinterSensorStateObj(
          this.hass,
          this.printerEntities,
          this.printerEntityIdPart,
          "target_nozzle_temperature",
          0,
          { limit_min: 0, limit_max: 0 },
        );
        this.currentTargetTempNozzle = currentTargetTempNozzleState.state;
        this.minTargetTempNozzle =
          currentTargetTempNozzleState.attributes.limit_min;
        this.maxTargetTempNozzle =
          currentTargetTempNozzleState.attributes.limit_max;
      }
      if (!this._userEditTargetTempHotbed) {
        const currentTargetTempHotbedState = getPrinterSensorStateObj(
          this.hass,
          this.printerEntities,
          this.printerEntityIdPart,
          "target_hotbed_temperature",
          0,
          { limit_min: 0, limit_max: 0 },
        );
        this.currentTargetTempHotbed = currentTargetTempHotbedState.state;
        this.minTargetTempHotbed =
          currentTargetTempHotbedState.attributes.limit_min;
        this.maxTargetTempHotbed =
          currentTargetTempHotbedState.attributes.limit_max;
      }

      if (!this._userEditSpeedMode) {
        const speedModeState = getPrinterSensorStateObj(
          this.hass,
          this.printerEntities,
          this.printerEntityIdPart,
          "raw_print_speed_mode_code",
          -1,
          { available_modes: [] },
        );
        this.availableSpeedModes = speedModesFromStateObj(speedModeState);
        this.currentSpeedModeKey = speedModeState.state;
        this.currentSpeedModeDescr =
          this.currentSpeedModeKey >= 0 &&
          this.currentSpeedModeKey in this.availableSpeedModes
            ? this.availableSpeedModes[this.currentSpeedModeKey]
            : undefined;
      }
    }
  }

  protected update(changedProperties: PropertyValues<this>): void {
    super.update(changedProperties);
    if (this._isOpen) {
      this.style.display = "block";
    } else {
      this.style.display = "none";
    }
  }

  render(): any {
    const stylesMain = {
      height: this.isHidden ? "1px" : "auto",
      opacity: this.isHidden ? 0.0 : 1.0,
      scale: this.isHidden ? 0.0 : 1.0,
    };

    return html`
      <div
        class="ac-modal-container"
        style=${styleMap(stylesMain)}
        ${animate({ ...animOptionsCard })}
      >
        <span
          class="ac-modal-close"
          @click="${(e): void => {
            this._closeModal(e);
          }}"
          >&times;</span
        >
        <div
          class="ac-modal-card"
          @click="${(e): void => {
            this._cardClick(e);
          }}"
        >
          ${this._renderCard()}
        </div>
      </div>
    `;
  }

  _renderCard(): any {
    return html`
      <div>
        <div class="ac-settings-header">Print Settings</div>
        <div>
          <div class="ac-settings-row">
            <anycubic-ui-select-dropdown
              .availableOptions=${this.availableSpeedModes}
              .placeholder=${"Standard"}
              .initialItem=${this.currentSpeedModeDescr}
            ></anycubic-ui-select-dropdown>
            <ha-control-button
              @click="${(_e): void => {
                this._handleSaveSpeedModeButton();
              }}"
            >
              Save Speed Mode
            </ha-control-button>
          </div>
          <div class="ac-settings-row">
            <ha-textfield
              .value=${this.currentTargetTempNozzle}
              .placeholder=${this.currentTargetTempNozzle}
              .label=${"Nozzle Temperature"}
              .type=${"number"}
              .min=${this.minTargetTempNozzle}
              .max=${this.maxTargetTempNozzle}
              @input=${this._handleTargetTempNozzleChange}
              @keydown=${this._handleTargetTempNozzleKeyDown}
            ></ha-textfield>
            <ha-control-button
              @click="${(_e): void => {
                this._handleSaveTargetTempNozzleButton();
              }}"
            >
              Save Target Nozzle
            </ha-control-button>
          </div>
          <div class="ac-settings-row">
            <ha-textfield
              .value=${this.currentTargetTempHotbed}
              .placeholder=${this.currentTargetTempHotbed}
              .label=${"Hotbed Temperature"}
              .type=${"number"}
              .min=${this.minTargetTempHotbed}
              .max=${this.maxTargetTempHotbed}
              @input=${this._handleTargetTempHotbedChange}
              @keydown=${this._handleTargetTempHotbedKeyDown}
            ></ha-textfield>
            <ha-control-button
              @click="${(_e): void => {
                this._handleSaveTargetTempHotbedButton();
              }}"
            >
              Save Target Hotbed
            </ha-control-button>
          </div>
          <div class="ac-settings-row">
            <ha-textfield
              .value=${this.currentFanSpeed}
              .placeholder=${this.currentFanSpeed}
              .label=${"Fan Speed"}
              .type=${"number"}
              .min=${0}
              .max=${100}
              @input=${this._handleFanSpeedChange}
              @keydown=${this._handleFanSpeedKeyDown}
            ></ha-textfield>
            <ha-control-button
              @click="${(_e): void => {
                this._handleSaveFanSpeedButton();
              }}"
            >
              Save Fan Speed
            </ha-control-button>
          </div>
          <div class="ac-settings-row ac-disabled-feature">
            <ha-textfield
              .value=${this.currentAuxFanSpeed}
              .placeholder=${this.currentAuxFanSpeed}
              .label=${"AUX Fan Speed"}
              .type=${"number"}
              .min=${0}
              .max=${100}
              @input=${this._handleAuxFanSpeedChange}
              @keydown=${this._handleAuxFanSpeedKeyDown}
            ></ha-textfield>
            <ha-control-button
              @click="${(_e): void => {
                this._handleSaveAuxFanSpeedButton();
              }}"
            >
              Save AUX Fan Speed
            </ha-control-button>
          </div>
          <div class="ac-settings-row ac-disabled-feature">
            <ha-textfield
              .value=${this.currentBoxFanSpeed}
              .placeholder=${this.currentBoxFanSpeed}
              .label=${"Box Fan Speed"}
              .type=${"number"}
              .min=${0}
              .max=${100}
              @input=${this._handleBoxFanSpeedChange}
              @keydown=${this._handleBoxFanSpeedKeyDown}
            ></ha-textfield>
            <ha-control-button
              @click="${(_e): void => {
                this._handleSaveBoxFanSpeedButton();
              }}"
            >
              Save Box Fan Speed
            </ha-control-button>
          </div>
        </div>
      </div>
    `;
  }

  private _handleFanSpeedChange(ev: Event): void {
    const newSpeed = (ev.currentTarget as any).value;
    this.currentFanSpeed = Number(newSpeed);
    this._userEditFanSpeed = true;
  }

  private _handleAuxFanSpeedChange(ev: Event): void {
    const newSpeed = (ev.currentTarget as any).value;
    this.currentAuxFanSpeed = Number(newSpeed);
    this._userEditAuxFanSpeed = true;
  }

  private _handleBoxFanSpeedChange(ev: Event): void {
    const newSpeed = (ev.currentTarget as any).value;
    this.currentBoxFanSpeed = Number(newSpeed);
    this._userEditBoxFanSpeed = true;
  }

  private _handleFanSpeedKeyDown(ev: Event): void {
    if (ev.code === "Enter") {
      ev.preventDefault();
      this._submitChangedFanSpeed();
    } else {
      this._userEditFanSpeed = true;
    }
  }

  private _handleAuxFanSpeedKeyDown(ev: Event): void {
    if (ev.code === "Enter") {
      ev.preventDefault();
      this._submitChangedAuxFanSpeed();
    } else {
      this._userEditAuxFanSpeed = true;
    }
  }

  private _handleBoxFanSpeedKeyDown(ev: Event): void {
    if (ev.code === "Enter") {
      ev.preventDefault();
      this._submitChangedBoxFanSpeed();
    } else {
      this._userEditBoxFanSpeed = true;
    }
  }

  private _handleTargetTempNozzleChange(ev: Event): void {
    const newTemp = (ev.currentTarget as any).value;
    this.currentTargetTempNozzle = Number(newTemp);
    this._userEditTargetTempNozzle = true;
  }

  private _handleTargetTempHotbedChange(ev: Event): void {
    const newTemp = (ev.currentTarget as any).value;
    this.currentTargetTempHotbed = Number(newTemp);
    this._userEditTargetTempHotbed = true;
  }

  private _handleTargetTempNozzleKeyDown(ev: Event): void {
    if (ev.code === "Enter") {
      ev.preventDefault();
      this._submitChangedTargetTempNozzle();
    } else {
      this._userEditTargetTempNozzle = true;
    }
  }

  private _handleTargetTempHotbedKeyDown(ev: Event): void {
    if (ev.code === "Enter") {
      ev.preventDefault();
      this._submitChangedTargetTempHotbed();
    } else {
      this._userEditTargetTempHotbed = true;
    }
  }

  private _handleModalEvent(e: Event): void {
    e.stopPropagation();
    if (e.detail.modalOpen) {
      this._isOpen = true;
      this._resetUserEdits();
    }
  }

  private _handleDropdownEvent(e: Event): void {
    e.stopPropagation();
    this._userEditSpeedMode = true;
    if (typeof e.detail.key !== "undefined") {
      this.currentSpeedModeKey = e.detail.key;
      this.currentSpeedModeDescr =
        this.currentSpeedModeKey >= 0 &&
        this.currentSpeedModeKey in this.availableSpeedModes
          ? this.availableSpeedModes[this.currentSpeedModeKey]
          : undefined;
    }
  }

  private _handleSaveFanSpeedButton(): void {
    this._submitChangedFanSpeed();
    this._resetUserEdits();
  }

  private _handleSaveAuxFanSpeedButton(): void {
    this._submitChangedAuxFanSpeed();
    this._resetUserEdits();
  }

  private _handleSaveBoxFanSpeedButton(): void {
    this._submitChangedBoxFanSpeed();
    this._resetUserEdits();
  }

  private _handleSaveSpeedModeButton(): void {
    this._submitChangedSpeedMode();
    this._resetUserEdits();
  }

  private _handleSaveTargetTempNozzleButton(): void {
    this._submitChangedTargetTempNozzle();
    this._resetUserEdits();
  }

  private _handleSaveTargetTempHotbedButton(): void {
    this._submitChangedTargetTempHotbed();
    this._resetUserEdits();
  }

  private _resetUserEdits(): void {
    this._userEditFanSpeed = false;
    this._userEditAuxFanSpeed = false;
    this._userEditBoxFanSpeed = false;
    this._userEditTargetTempNozzle = false;
    this._userEditTargetTempHotbed = false;
    this._userEditSpeedMode = false;
  }

  private _closeModal(e?: Event | undefined): void {
    if (e) {
      e.stopPropagation();
    }
    this._isOpen = false;
    this._resetUserEdits();
  }

  private _cardClick(e: Event): void {
    e.stopPropagation();
  }

  private _submitChangedSpeedMode(): void {
    if (this._userEditSpeedMode && this.selectedPrinterDevice) {
      const serv = "change_print_speed_mode";
      this.hass.callService(platform, serv, {
        config_entry: this.selectedPrinterDevice.primary_config_entry,
        device_id: this.selectedPrinterDevice.id,
        speed_mode: this.currentSpeedModeKey,
      });
      this._closeModal();
    }
  }

  private _submitChangedFanSpeed(): void {
    if (this._userEditFanSpeed && this.selectedPrinterDevice) {
      const serv = "change_print_fan_speed";
      this.hass.callService(platform, serv, {
        config_entry: this.selectedPrinterDevice.primary_config_entry,
        device_id: this.selectedPrinterDevice.id,
        speed: this.currentFanSpeed,
      });
      this._closeModal();
    }
  }

  private _submitChangedAuxFanSpeed(): void {
    if (this._userEditAuxFanSpeed && this.selectedPrinterDevice) {
      const serv = "change_print_aux_fan_speed";
      this.hass.callService(platform, serv, {
        config_entry: this.selectedPrinterDevice.primary_config_entry,
        device_id: this.selectedPrinterDevice.id,
        speed: this.currentAuxFanSpeed,
      });
      this._closeModal();
    }
  }

  private _submitChangedBoxFanSpeed(): void {
    if (this._userEditBoxFanSpeed && this.selectedPrinterDevice) {
      const serv = "change_print_box_fan_speed";
      this.hass.callService(platform, serv, {
        config_entry: this.selectedPrinterDevice.primary_config_entry,
        device_id: this.selectedPrinterDevice.id,
        speed: this.currentBoxFanSpeed,
      });
      this._closeModal();
    }
  }

  private _submitChangedTargetTempNozzle(): void {
    if (this._userEditTargetTempNozzle && this.selectedPrinterDevice) {
      const serv = "change_print_target_nozzle_temperature";
      this.hass.callService(platform, serv, {
        config_entry: this.selectedPrinterDevice.primary_config_entry,
        device_id: this.selectedPrinterDevice.id,
        temperature: this.currentTargetTempNozzle,
      });
      this._closeModal();
    }
  }

  private _submitChangedTargetTempHotbed(): void {
    if (this._userEditTargetTempHotbed && this.selectedPrinterDevice) {
      const serv = "change_print_target_hotbed_temperature";
      this.hass.callService(platform, serv, {
        config_entry: this.selectedPrinterDevice.primary_config_entry,
        device_id: this.selectedPrinterDevice.id,
        temperature: this.currentTargetTempHotbed,
      });
      this._closeModal();
    }
  }

  static get styles(): any {
    return css`
      ${commonModalStyle}

      .ac-settings-header {
        font-size: 24px;
        text-align: center;
        font-weight: 600;
        margin-bottom: 20px;
      }

      .ac-settings-row {
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
      }

      .ac-disabled-feature {
        display: none;
      }

      ha-textfield {
        min-width: 150px;
        width: 100%;
      }

      ha-control-button {
        min-width: 150px;
        margin: 8px 0px 0px 8px;
        font-size: 14px;
      }
    `;
  }
}
