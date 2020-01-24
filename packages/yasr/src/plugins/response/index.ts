/**
 * Make sure not to include any deps from our main index file. That way, we can easily publish the publin as standalone build
 */
import { Plugin, DownloadInfo } from "../";
import Yasr from "../../";
require("./index.scss");
const CodeMirror = require("codemirror");
require("codemirror/addon/fold/foldcode.js");
require("codemirror/addon/fold/foldgutter.js");
require("codemirror/addon/fold/xml-fold.js");
require("codemirror/addon/fold/brace-fold.js");

require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/mode/xml/xml.js");

require("codemirror/mode/javascript/javascript.js");
require("codemirror/lib/codemirror.css");
import { drawSvgStringAsElement, addClass, removeClass, drawFontAwesomeIconAsSvg } from "@triply/yasgui-utils";
import * as faAlignIcon from "@fortawesome/free-solid-svg-icons/faAlignLeft";

import * as imgs from "../../imgs";
export interface PluginConfig {
  maxLines: number;
}
export default class Response implements Plugin<PluginConfig> {
  private yasr: Yasr;
  label = "Response";
  priority = 2;
  helpReference = "https://triply.cc/docs/yasgui#response";
  private config: PluginConfig;
  private overLay: HTMLDivElement;
  private cm: CodeMirror.Editor;
  constructor(yasr: Yasr) {
    this.yasr = yasr;
    this.config = Response.defaults;
    if (yasr.config.plugins["response"] && yasr.config.plugins["response"].dynamicConfig) {
      this.config = {
        ...this.config,
        ...yasr.config.plugins["response"].dynamicConfig
      };
    }
  }
  // getDownloadInfo: getDownloadInfo
  canHandleResults() {
    if (!this.yasr.results) return false;
    if (!this.yasr.results.getOriginalResponseAsString) return false;
    var response = this.yasr.results.getOriginalResponseAsString();
    if ((!response || response.length == 0) && this.yasr.results.getError()) return false; //in this case, show exception instead, as we have nothing to show anyway
    return true;
  }
  public getIcon() {
    return drawSvgStringAsElement(drawFontAwesomeIconAsSvg(faAlignIcon));
  }
  download(): DownloadInfo {
    if (!this.yasr.results) return;
    const contentType = this.yasr.results.getContentType();
    const type = this.yasr.results.getType();
    return {
      getData: () => {
        return this.yasr.results.getOriginalResponseAsString();
      },
      filename: "queryResults" + (type ? "." + type : ""),
      contentType: contentType ? contentType : "text/plain",
      title: "Download result"
    };
  }
  draw() {
    // When the original response is empty, use an empty string
    let value = this.yasr.results.getOriginalResponseAsString() || "";
    const lines = value.split("\n");
    if (lines.length > this.config.maxLines) {
      value = lines.slice(0, this.config.maxLines).join("\n");
    }

    const codemirrorOpts: Partial<CodeMirror.EditorConfiguration> = {
      readOnly: true,
      lineNumbers: true,
      lineWrapping: true,
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      value: value
    };
    const mode = this.yasr.results.getType();
    if (mode === "json") {
      codemirrorOpts.mode = { name: "javascript", json: true };
    }

    this.cm = CodeMirror(this.yasr.resultsEl, codemirrorOpts);
    // Don't show less originally we've already set the value in the codemirrorOpts
    if (lines.length > this.config.maxLines) this.showLess(false);

    // //CM has some issues with folding and unfolding (blank parts in the codemirror area, which are only filled after clicking it)
    // //so, refresh cm after folding/unfolding
    // cm.on("fold", function() {
    //   cm.refresh();
    // });
    // cm.on("unfold", function() {
    //   cm.refresh();
    // });
  }
  private limitData(results: string) {
    let value = this.yasr.results.getOriginalResponseAsString() || "";
    const lines = value.split("\n");
    if (lines.length > this.config.maxLines) {
      value = lines.slice(0, this.config.maxLines).join("\n");
    }
    return value;
  }
  /**
   *
   * @param setValue Optional, if set to false the string will not update
   */
  showLess(setValue = true) {
    // Add overflow
    addClass(this.cm.getWrapperElement(), "overflow");

    // Remove old instance
    if (this.overLay) {
      this.overLay.remove();
      this.overLay = undefined;
    }

    // Wrapper
    this.overLay = document.createElement("div");
    addClass(this.overLay, "overlay");

    // overlay content
    const overlayContent = document.createElement("div");
    addClass(overlayContent, "overlay_content");

    const showMoreButton = document.createElement("button");
    showMoreButton.title = "Show all";
    addClass(showMoreButton, "yasr_btn", "overlay_btn");
    showMoreButton.textContent = "Show all";
    showMoreButton.onclick = () => this.showMore();
    overlayContent.append(showMoreButton);

    const downloadButton = document.createElement("button");
    downloadButton.title = "Download result";
    addClass(downloadButton, "yasr_btn", "overlay_btn");

    const text = document.createElement("span");
    text.innerText = "Download result";
    downloadButton.appendChild(text);
    downloadButton.appendChild(drawSvgStringAsElement(imgs.download));
    downloadButton.onclick = () => this.yasr.download();

    overlayContent.appendChild(downloadButton);
    this.overLay.appendChild(overlayContent);
    this.cm.getWrapperElement().appendChild(this.overLay);
    if (setValue) {
      this.cm.setValue(this.limitData(this.yasr.results.getOriginalResponseAsString()));
    }
  }
  /**
   * Render the raw response full length
   */
  showMore() {
    removeClass(this.cm.getWrapperElement(), "overflow");
    if (this.overLay) this.overLay.remove();
    this.overLay = undefined;
    this.cm.setValue(this.yasr.results.getOriginalResponseAsString() || "");
  }
  public static defaults: PluginConfig = {
    maxLines: 30
  };
}