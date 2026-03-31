import * as vscode from "vscode";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ModelManager } from "../llm/ModelManager";
import type { SettingsManager } from "../settings/SettingsManager";
import type { WebviewToExtensionMessage } from "../shared/webviewProtocol";
import { SettingsBridge } from "./SettingsBridge";

/**
 * Registers the sidebar webview and delegates messaging to {@link SettingsBridge}.
 */
export class SettingsPanelProvider implements vscode.WebviewViewProvider {
  private bridge?: SettingsBridge;
  private configListener?: vscode.Disposable;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly settingsManager: SettingsManager,
    private readonly modelManager: ModelManager
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist")]
    };

    this.bridge = new SettingsBridge(this.settingsManager, this.modelManager, (msg) => {
      void webviewView.webview.postMessage(msg);
    });

    webviewView.webview.onDidReceiveMessage((msg: WebviewToExtensionMessage) => {
      this.bridge?.handleMessage(msg);
    });

    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "settingsPanel.js")
    );
    const cssUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "settingsPanel.css")
    );
    webviewView.webview.html = this.buildWebviewHtml(webviewView.webview, scriptUri, cssUri);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.bridge?.pushState();
      }
    });

    this.configListener?.dispose();
    this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("contextshield")) {
        this.bridge?.pushState();
      }
    });

    webviewView.onDidDispose(() => {
      this.configListener?.dispose();
      this.configListener = undefined;
      this.bridge = undefined;
    });
  }

  private buildWebviewHtml(webview: vscode.Webview, scriptUri: vscode.Uri, cssUri: vscode.Uri): string {
    const templatePath = path.join(this.extensionUri.fsPath, "dist", "settingsPanel.html");
    const nonce = crypto.randomBytes(16).toString("base64");
    const html = fs.readFileSync(templatePath, "utf8");
    return html
      .replace(/\{\{SCRIPT_URI\}\}/g, scriptUri.toString())
      .replace(/\{\{STYLE_URI\}\}/g, cssUri.toString())
      .replace(/\{\{CSP_SOURCE\}\}/g, webview.cspSource)
      .replace(/\{\{NONCE\}\}/g, nonce);
  }
}
