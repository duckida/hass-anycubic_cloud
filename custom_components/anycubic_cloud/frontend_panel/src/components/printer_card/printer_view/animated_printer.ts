import { LitElement, html, css, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { query } from "lit/decorators/query.js";
import { ResizeController } from "@lit-labs/observers/resize-controller.js";
import { animate } from "@lit-labs/motion";

import { customElementIfUndef } from "../../../internal/register-custom-element";

import {
  getPrinterSensorStateObj,
  isPrintStatePrinting,
  updateElementStyleWithObject,
} from "../../../helpers";

import {
  AnimatedPrinterConfig,
  AnimatedPrinterDimensions,
  HassEntityInfos,
  HomeAssistant,
} from "../../../types";

import { getDimensions } from "./utils";

const animOptionsGantry = {
  keyframeOptions: {
    duration: 2000,
    direction: "alternate",
  },
  properties: ["left"],
};

const animOptionsAxis = {
  keyframeOptions: {
    duration: 100,
  },
  properties: ["top"],
};

@customElementIfUndef("anycubic-printercard-animated_printer")
export class AnycubicPrintercardAnimatedPrinter extends LitElement {
  @query(".ac-printercard-animatedprinter")
  private _rootElement;

  @query(".ac-apr-scalable")
  private _elAcAPr_scalable;

  @query(".ac-apr-frame")
  private _elAcAPr_frame;

  @query(".ac-apr-hole")
  private _elAcAPr_hole;

  @query(".ac-apr-buildarea")
  private _elAcAPr_buildarea;

  @query(".ac-apr-animprint")
  private _elAcAPr_animprint;

  @query(".ac-apr-buildplate")
  private _elAcAPr_buildplate;

  @query(".ac-apr-xaxis")
  private _elAcAPr_xaxis;

  @query(".ac-apr-gantry")
  private _elAcAPr_gantry;

  @query(".ac-apr-nozzle")
  private _elAcAPr_nozzle;

  @property()
  public hass!: HomeAssistant;

  @property()
  public scaleFactor?: number;

  @property()
  public printerConfig: AnimatedPrinterConfig;

  @property()
  public printerEntities: HassEntityInfos;

  @property()
  public printerEntityIdPart: string | undefined;

  @state()
  private dimensions: AnimatedPrinterDimensions | undefined;

  @state()
  private resizeObserver: ResizeController | undefined;

  @state()
  private _progressNum: number = 0;

  @state({ type: Number })
  private animKeyframeGantry: number = 0;

  @state({ type: Boolean })
  private _isPrinting: boolean = false;

  public connectedCallback(): void {
    super.connectedCallback();

    this.resizeObserver = new ResizeController(this, {
      callback: this._onResizeEvent,
    });
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (
      changedProperties.has("hass") ||
      changedProperties.has("printerEntities") ||
      changedProperties.has("printerEntityIdPart")
    ) {
      this._progressNum =
        getPrinterSensorStateObj(
          this.hass,
          this.printerEntities,
          this.printerEntityIdPart,
          "project_progress",
          0,
        ).state / 100;
      const printingState = getPrinterSensorStateObj(
        this.hass,
        this.printerEntities,
        this.printerEntityIdPart,
        "print_state",
      ).state.toLowerCase();

      this._isPrinting = isPrintStatePrinting(printingState);
    }
  }

  protected update(changedProperties: PropertyValues<this>): void {
    super.update(changedProperties);

    if (
      (changedProperties.has("dimensions") ||
        changedProperties.has("animKeyframeGantry") ||
        changedProperties.has("hass")) &&
      this.dimensions
    ) {
      const progY = this._progressNum * -1 * this.dimensions.BuildArea.height;
      updateElementStyleWithObject(this._elAcAPr_xaxis, {
        ...this.dimensions.XAxis,
        top: this.dimensions.XAxis.top + progY,
      });
      updateElementStyleWithObject(this._elAcAPr_gantry, {
        ...this.dimensions.Gantry,
        left:
          this.animKeyframeGantry !== 0
            ? this.dimensions.Gantry.left + this.dimensions.BuildPlate.width
            : this.dimensions.Gantry.left,
        top: this.dimensions.Gantry.top + progY,
      });
      updateElementStyleWithObject(this._elAcAPr_animprint, {
        height: `${this._progressNum * 100}%`,
      });

      if (changedProperties.has("dimensions") && this.dimensions) {
        updateElementStyleWithObject(this._elAcAPr_scalable, {
          ...this.dimensions.Scalable,
        });
        updateElementStyleWithObject(this._elAcAPr_frame, {
          ...this.dimensions.Frame,
        });
        updateElementStyleWithObject(this._elAcAPr_hole, {
          ...this.dimensions.Hole,
        });
        updateElementStyleWithObject(this._elAcAPr_buildarea, {
          ...this.dimensions.BuildArea,
        });
        updateElementStyleWithObject(this._elAcAPr_buildplate, {
          ...this.dimensions.BuildPlate,
        });
        updateElementStyleWithObject(this._elAcAPr_nozzle, {
          ...this.dimensions.Nozzle,
        });
      }
    }
  }

  render(): any {
    return html`
      <div class="ac-printercard-animatedprinter">
        ${this.dimensions
          ? html` <div class="ac-apr-scalable">
              <div class="ac-apr-frame">
                <div class="ac-apr-hole"></div>
              </div>
              <div class="ac-apr-buildarea">
                <div class="ac-apr-animprint"></div>
              </div>
              <div class="ac-apr-buildplate"></div>
              <div
                class="ac-apr-xaxis"
                ${animate({ ...animOptionsAxis })}
              ></div>
              <div
                class="ac-apr-gantry"
                ${animate({ ...animOptionsAxis })}
                ${this.dimensions && this._isPrinting
                  ? animate({
                      ...animOptionsGantry,
                      onComplete: () => this._moveGantry(),
                    })
                  : null}
              >
                <div class="ac-apr-nozzle"></div>
              </div>
            </div>`
          : null}
      </div>
    `;
  }

  private _onResizeEvent = (): void => {
    if (this._rootElement) {
      const height = this._rootElement.clientHeight;
      const width = this._rootElement.clientWidth;
      this._setDimensions(width, height);
    }
  };

  private _setDimensions(width: number, height: number): void {
    this.dimensions = getDimensions(
      this.printerConfig,
      { width, height },
      this.scaleFactor || 1.0,
    );
  }

  private _moveGantry(): void {
    this.animKeyframeGantry = !this.animKeyframeGantry;
  }

  static get styles(): any {
    return css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }

      .ac-printercard-animatedprinter {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .ac-apr-scalable {
        position: relative;
      }

      .ac-apr-frame {
        top: 0px;
        left: 0px;
        border-radius: 8px;
        background-color: #bbbbbb;
        position: absolute;
      }

      .ac-apr-hole {
        position: absolute;
        top: 0px;
        left: 0px;
        background-color: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        border-radius: 8px;
      }

      .ac-apr-buildarea {
        background-color: rgba(0, 0, 0, 0.075);
        box-sizing: border-box;
        position: absolute;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        border-radius: 8px;
        overflow: hidden;
      }

      .ac-apr-buildplate {
        box-sizing: border-box;
        border-radius: 8px;
        position: absolute;
        background-color: #333333;
        height: 8px;
      }

      .ac-apr-xaxis {
        position: absolute;
        border-radius: 8px;
        background-color: #aaaaaa;
      }

      .ac-apr-animprint {
        background-color: var(--primary-text-color);
        width: 100%;
      }

      .ac-apr-gantry {
        background-color: #333333;
        border-radius: 4px;
        box-sizing: border-box;
        position: absolute;
      }

      .ac-apr-nozzle {
        background-color: #aaaaaa;
        position: absolute;
        width: 12px;
        height: 12px;
        clip-path: polygon(100% 0, 100% 50%, 50% 75%, 0 50%, 0 0);
      }
    `;
  }
}
