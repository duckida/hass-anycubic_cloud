import { mdiPower, mdiLightbulbOn, mdiLightbulbOff } from "@mdi/js";
import { LitElement, html, css, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit-html/directives/style-map.js";
import { animate } from "@lit-labs/motion";

import { customElementIfUndef } from "../../../internal/register-custom-element";

import {
  HassDevice,
  HassEntity,
  HassEntityInfos,
  HomeAssistant,
  PrinterCardStatType,
  TemperatureUnit,
} from "../../../types";

import {
  getDefaultMonitoredStats,
  getEntityState,
  getEntityStateBinary,
  getPrinterEntities,
  getPrinterEntityIdPart,
  getPrinterSensorStateObj,
  isPrintStatePrinting,
  printStateStatusColor,
  undefinedDefault,
} from "../../../helpers";

import "../camera_view/camera_view.ts";
import "../multicolorbox_view/multicolorbox_view.ts";
import "../printer_view/printer_view.ts";
import "../stats/stats_component.ts";

const animOptionsCard = {
  keyframeOptions: {
    duration: 250,
    direction: "normal",
    easing: "ease-in-out",
  },
  properties: ["height", "opacity", "scale"],
};

const defaultMonitoredStats: PrinterCardStatType[] = getDefaultMonitoredStats();

@customElementIfUndef("anycubic-printercard-card")
export class AnycubicPrintercardCard extends LitElement {
  @property()
  public hass!: HomeAssistant;

  @property()
  public monitoredStats?: PrinterCardStatType[] = defaultMonitoredStats;

  @property()
  public selectedPrinterID: string | undefined;

  @property()
  public selectedPrinterDevice: HassDevice | undefined;

  @property({ type: Boolean })
  public round?: boolean = true;

  @property({ type: Boolean })
  public use_24hr?: boolean;

  @property({ type: String })
  public temperatureUnit: TemperatureUnit = TemperatureUnit.C;

  @property({ type: String })
  public lightEntityId?: string;

  @property({ type: String })
  public powerEntityId?: string;

  @property({ type: String })
  public cameraEntityId?: string;

  @property({ type: Boolean })
  public vertical?: boolean;

  @state()
  private _showVideo: boolean = false;

  @state()
  private cameraEntityState: HassEntity | undefined = undefined;

  @state({ type: Boolean })
  private isHidden: boolean = false;

  @state({ type: Boolean })
  private hiddenOverride: boolean = false;

  @state({ type: Boolean })
  private hasColorbox: boolean = false;

  @state({ type: Boolean })
  private lightIsOn: boolean = false;

  @state({ type: String })
  private statusColor: string = "#ffc107";

  @state()
  private printerEntities: HassEntityInfos;

  @state()
  private printerEntityIdPart: string | undefined;

  @state()
  private progressPercent: number = 0;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("monitoredStats")) {
      this.monitoredStats = undefinedDefault(
        this.monitoredStats,
        defaultMonitoredStats,
      );
    }

    if (changedProperties.has("selectedPrinterID")) {
      this.printerEntities = getPrinterEntities(
        this.hass,
        this.selectedPrinterID,
      );

      this.printerEntityIdPart = getPrinterEntityIdPart(this.printerEntities);
    }

    if (
      changedProperties.has("hass") ||
      changedProperties.has("selectedPrinterID")
    ) {
      this.progressPercent = this._percentComplete();
      this.hasColorbox =
        getPrinterSensorStateObj(
          this.hass,
          this.printerEntities,
          this.printerEntityIdPart,
          "multi_color_box_spools",
          "inactive",
        ).state === "active";
      if (this.cameraEntityId) {
        this.cameraEntityState = getEntityState(this.hass, {
          entity_id: this.cameraEntityId,
        });
      }
      this.lightIsOn = getEntityStateBinary(
        this.hass,
        { entity_id: this.lightEntityId },
        true,
        false,
      );
      const printStateString = getPrinterSensorStateObj(
        this.hass,
        this.printerEntities,
        this.printerEntityIdPart,
        "print_state",
        "unknown",
      ).state.toLowerCase();
      this.isHidden =
        !isPrintStatePrinting(printStateString) && !this.hiddenOverride;
      this.statusColor = printStateStatusColor(printStateString);
      this.lightIsOn = getEntityStateBinary(
        this.hass,
        { entity_id: this.lightEntityId },
        true,
        false,
      );
    }
  }

  render(): any {
    const classesCam = {
      "ac-hidden": this._showVideo === true ? false : true,
    };

    return html`
      <div class="ac-printer-card">
        <div class="ac-printer-card-mainview">
          ${this._renderHeader()} ${this._renderPrinterContainer()}
        </div>
        <anycubic-printercard-camera_view
          class="${classMap(classesCam)}"
          .showVideo=${this._showVideo}
          .toggleVideo=${(): void => this._toggleVideo()}
          .cameraEntity=${this.cameraEntityState}
        ></anycubic-printercard-camera_view>
      </div>
    `;
  }

  private _renderHeader(): HTMLElement {
    const classesHeader = {
      "ac-h-justifycenter":
        this.powerEntityId && this.lightEntityId ? false : true,
    };

    const stylesDot = {
      "background-color": this.statusColor,
    };

    return html`
      <div class="ac-printer-card-header ${classMap(classesHeader)}">
        ${this.powerEntityId
          ? html`
              <button
                class="ac-printer-card-button-small"
                @click="${(_e): void => {
                  this._togglePowerEntity();
                }}"
              >
                <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
              </button>
            `
          : null}

        <button
          class="ac-printer-card-button-name"
          @click="${(_e): void => {
            this._toggleHiddenOveride();
          }}"
        >
          <div
            class="ac-printer-card-header-status-dot"
            style=${styleMap(stylesDot)}
          ></div>
          <p class="ac-printer-card-header-status-text">
            ${this.selectedPrinterDevice?.name}
          </p>
        </button>
        ${this.lightEntityId
          ? html`
              <button
                class="ac-printer-card-button-small"
                @click="${(_e): void => {
                  this._toggleLightEntity();
                }}"
              >
                <ha-svg-icon
                  .path=${this.lightIsOn ? mdiLightbulbOn : mdiLightbulbOff}
                ></ha-svg-icon>
              </button>
            `
          : null}
      </div>
    `;
  }

  private _renderPrinterContainer(): HTMLElement {
    const classesMain = {
      "ac-card-vertical": this.vertical ? true : false,
    };
    const stylesMain = {
      height: this.isHidden ? "1px" : "auto",
      opacity: this.isHidden ? 0.0 : 1.0,
      scale: this.isHidden ? 0.0 : 1.0,
    };

    return html`
      <div
        class="ac-printer-card-infocontainer ${classMap(classesMain)}"
        style=${styleMap(stylesMain)}
        ${animate({ ...animOptionsCard })}
      >
        <div
          class="ac-printer-card-info-animcontainer ${classMap(classesMain)}"
        >
          <anycubic-printercard-printer_view
            .hass=${this.hass}
            .printerEntities=${this.printerEntities}
            .printerEntityIdPart=${this.printerEntityIdPart}
            .toggleVideo=${(): void => this._toggleVideo()}
          ></anycubic-printercard-printer_view>
          ${this.vertical
            ? html`<p class="ac-printer-card-info-vertprog">
                ${this.round
                  ? Math.round(this.progressPercent)
                  : this.progressPercent}%
              </p>`
            : null}
        </div>
        <div
          class="ac-printer-card-info-statscontainer ${classMap(classesMain)}"
        >
          <anycubic-printercard-stats-component
            .hass=${this.hass}
            .monitoredStats=${this.monitoredStats}
            .printerEntities=${this.printerEntities}
            .printerEntityIdPart=${this.printerEntityIdPart}
            .progressPercent=${this.progressPercent}
            .showPercent=${!this.vertical}
            .round=${this.round}
            .use_24hr=${this.use_24hr}
            .temperatureUnit=${this.temperatureUnit}
          ></anycubic-printercard-stats-component>
        </div>
      </div>
      ${this._renderMultiColorBoxContainer()}
    `;
  }

  private _toggleVideo(): void {
    this._showVideo = this.cameraEntityState && !this._showVideo ? true : false;
  }

  private _renderMultiColorBoxContainer(): HTMLElement {
    const classesMain = {
      "ac-card-vertical": this.vertical ? true : false,
    };
    const stylesMain = {
      height: this.isHidden ? "1px" : "auto",
      opacity: this.isHidden ? 0.0 : 1.0,
      scale: this.isHidden ? 0.0 : 1.0,
    };

    return this.hasColorbox
      ? html`
          <div
            class="ac-printer-card-infocontainer ${classMap(classesMain)}"
            style=${styleMap(stylesMain)}
            ${animate({ ...animOptionsCard })}
          >
            <div class="ac-printer-card-mcbsection ${classMap(classesMain)}">
              <anycubic-printercard-multicolorbox_view
                .hass=${this.hass}
                .printerEntities=${this.printerEntities}
                .printerEntityIdPart=${this.printerEntityIdPart}
              ></anycubic-printercard-multicolorbox_view>
            </div>
          </div>
        `
      : null;
  }

  private _toggleLightEntity(): void {
    if (this.lightEntityId) {
      this.hass.callService("homeassistant", "toggle", {
        entity_id: this.lightEntityId,
      });
    }
  }

  private _togglePowerEntity(): void {
    if (this.powerEntityId) {
      this.hass.callService("homeassistant", "toggle", {
        entity_id: this.powerEntityId,
      });
    }
  }

  private _toggleHiddenOveride(): void {
    this.hiddenOverride = !this.hiddenOverride;
  }

  private _percentComplete(): number {
    return getPrinterSensorStateObj(
      this.hass,
      this.printerEntities,
      this.printerEntityIdPart,
      "project_progress",
      -1.0,
    ).state;
  }

  static get styles(): any {
    return css`
      :host {
        display: block;
      }

      .ac-printer-card {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: stretch;
        box-sizing: border-box;
        background: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        position: relative;
        overflow: hidden;
        border-radius: 16px;
        margin: 0px;
        box-shadow: var(
          --ha-card-box-shadow,
          0px 2px 1px -1px rgba(0, 0, 0, 0.2),
          0px 1px 1px 0px rgba(0, 0, 0, 0.14),
          0px 1px 3px 0px rgba(0, 0, 0, 0.12)
        );
      }

      .ac-printer-card-mainview {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        width: 100%;
      }

      .ac-printer-card-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        box-sizing: border-box;
        width: 100%;
        justify-content: space-between;
      }

      .ac-h-justifycenter {
        justify-content: center;
      }

      .ac-printer-card-button-small {
        border: none;
        outline: none;
        background-color: transparent;
        width: 32px;
        height: 32px;
        font-size: 22px;
        line-height: 22px;
        box-sizing: border-box;
        padding: 0px;
        margin-right: 24px;
        margin-left: 24px;
        cursor: pointer;
        color: var(--primary-text-color);
      }

      .ac-printer-card-button-name {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        border: none;
        outline: none;
        background-color: transparent;
        padding: 24px;
      }
      .ac-printer-card-header-status-dot {
        margin: 0px 10px;
        height: 10px;
        width: 10px;
        border-radius: 5px;
        box-sizing: border-box;
      }

      .ac-printer-card-header-status-text {
        font-weight: bold;
        font-size: 22px;
        margin: 0px;
        color: var(--primary-text-color);
      }

      .ac-printer-card-infocontainer {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
      }

      .ac-printer-card-infocontainer.ac-card-vertical {
        flex-direction: column;
      }

      .ac-printer-card-info-animcontainer {
        box-sizing: border-box;
        padding: 0px 16px 32px 16px;
        width: 50%;
        height: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        padding-left: 16px;
        padding-right: 16px;
        max-height: 270px;
      }

      .ac-printer-card-info-animcontainer.ac-card-vertical {
        width: 100%;
        height: auto;
        padding-left: 64px;
        padding-right: 64px;
        max-height: unset;
      }

      anycubic-printercard-printer_view {
        width: 100%;
        flex-glow: 1;
      }

      .ac-printer-card-info-vertprog {
        width: 50%;
        font-size: 36px;
        text-align: center;
        font-weight: bold;
      }

      anycubic-printercard-printer_view.ac-card-vertical {
        width: auto;
      }

      .ac-printer-card-info-statscontainer {
        box-sizing: border-box;
        padding: 0px 16px 32px 16px;
        padding-left: 16px;
        padding-right: 32px;
        width: 50%;
        height: 100%;
      }

      .ac-printer-card-info-statscontainer.ac-card-vertical {
        padding-left: 32px;
        padding-right: 32px;
        width: 100%;
        height: auto;
      }

      .ac-printer-card-mcbsection {
        box-sizing: border-box;
        padding: 5px 32px 5px 32px;
        width: 100%;
        height: 100%;
      }

      .ac-printer-card-mcbsection.ac-card-vertical {
        height: auto;
      }

      .ac-hidden {
        display: none;
      }
    `;
  }
}
