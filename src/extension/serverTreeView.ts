/**
 * Server Tree View for VS Code Sidebar
 * Provides UI controls for managing the server
 */

import * as vscode from 'vscode';
import { LLMServer } from './server';
import { getServerConfig } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * Tree item for the server view
 */
export class ServerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly contextValue?: string,
    public readonly description?: string,
    public readonly iconPath?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
    this.tooltip = this.description || this.label;
  }
}

/**
 * Tree data provider for the server view
 */
export class ServerTreeProvider implements vscode.TreeDataProvider<ServerTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ServerTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<ServerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ServerTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  constructor(
    private server: LLMServer | null,
    private context: vscode.ExtensionContext
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateServer(server: LLMServer | null): void {
    this.server = server;
    this.refresh();
  }

  getTreeItem(element: ServerTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ServerTreeItem): Promise<ServerTreeItem[]> {
    if (!element) {
      // Root level
      return this.getRootItems();
    }

    // Child items based on parent
    switch (element.contextValue) {
      case 'status':
        return this.getStatusItems();
      case 'configuration':
        return this.getConfigurationItems();
      case 'endpoints':
        return this.getEndpointItems();
      case 'actions':
        return this.getActionItems();
      default:
        return [];
    }
  }

  private getRootItems(): ServerTreeItem[] {
    return [
      new ServerTreeItem(
        'Status',
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'status',
        undefined,
        new vscode.ThemeIcon('pulse')
      ),
      new ServerTreeItem(
        'Configuration',
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        'configuration',
        undefined,
        new vscode.ThemeIcon('settings-gear')
      ),
      new ServerTreeItem(
        'Endpoints',
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        'endpoints',
        undefined,
        new vscode.ThemeIcon('globe')
      ),
      new ServerTreeItem(
        'Actions',
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'actions',
        undefined,
        new vscode.ThemeIcon('rocket')
      ),
    ];
  }

  private getStatusItems(): ServerTreeItem[] {
    const config = getServerConfig();
    const isRunning = this.server?.isRunning() ?? false;

    const items: ServerTreeItem[] = [
      new ServerTreeItem(
        isRunning ? 'Running' : 'Stopped',
        vscode.TreeItemCollapsibleState.None,
        undefined,
        'status-state',
        undefined,
        new vscode.ThemeIcon(
          isRunning ? 'check' : 'circle-slash',
          isRunning ? new vscode.ThemeColor('testing.iconPassed') : new vscode.ThemeColor('testing.iconFailed')
        )
      ),
    ];

    if (isRunning) {
      items.push(
        new ServerTreeItem(
          `Port: ${config.port}`,
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.changePort',
            title: 'Change Port',
          },
          'status-port',
          'Click to change port',
          new vscode.ThemeIcon('plug')
        ),
        new ServerTreeItem(
          `Host: ${config.host}`,
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.changeHost',
            title: 'Change Host',
          },
          'status-host',
          'Click to change host',
          new vscode.ThemeIcon('server')
        ),
        new ServerTreeItem(
          `URL: http://${config.host}:${config.port}`,
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.copyUrl',
            title: 'Copy URL',
          },
          'status-url',
          'Click to copy URL',
          new vscode.ThemeIcon('link')
        )
      );
    }

    return items;
  }

  private getConfigurationItems(): ServerTreeItem[] {
    const config = getServerConfig();

    return [
      new ServerTreeItem(
        `Port: ${config.port}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.changePort',
          title: 'Change Port',
        },
        'config-port',
        'Click to change',
        new vscode.ThemeIcon('plug')
      ),
      new ServerTreeItem(
        `Host: ${config.host}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.changeHost',
          title: 'Change Host',
        },
        'config-host',
        'Click to change',
        new vscode.ThemeIcon('server')
      ),
      new ServerTreeItem(
        `Auth: ${config.enableAuth ? 'Enabled' : 'Disabled'}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.toggleAuth',
          title: 'Toggle Authentication',
        },
        'config-auth',
        'Click to toggle',
        new vscode.ThemeIcon(config.enableAuth ? 'lock' : 'unlock')
      ),
      new ServerTreeItem(
        `Rate Limit: ${config.rateLimit === 0 ? 'Disabled' : `${config.rateLimit}/min`}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.changeRateLimit',
          title: 'Change Rate Limit',
        },
        'config-rate',
        'Click to change',
        new vscode.ThemeIcon('dashboard')
      ),
      new ServerTreeItem(
        `Log Level: ${config.logLevel}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.changeLogLevel',
          title: 'Change Log Level',
        },
        'config-log',
        'Click to change',
        new vscode.ThemeIcon('output')
      ),
      new ServerTreeItem(
        `OpenAI: ${config.enableOpenAI ? 'Enabled' : 'Disabled'}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.toggleOpenAI',
          title: 'Toggle OpenAI Endpoints',
        },
        'config-openai',
        'Click to toggle',
        new vscode.ThemeIcon(config.enableOpenAI ? 'check' : 'x')
      ),
      new ServerTreeItem(
        `Anthropic: ${config.enableAnthropic ? 'Enabled' : 'Disabled'}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.toggleAnthropic',
          title: 'Toggle Anthropic Endpoints',
        },
        'config-anthropic',
        'Click to toggle',
        new vscode.ThemeIcon(config.enableAnthropic ? 'check' : 'x')
      ),
    ];
  }

  private getEndpointItems(): ServerTreeItem[] {
    const config = getServerConfig();
    const baseUrl = `http://${config.host}:${config.port}`;

    const items: ServerTreeItem[] = [
      new ServerTreeItem(
        'Health Check',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.openEndpoint',
          title: 'Open Endpoint',
          arguments: [`${baseUrl}/health`],
        },
        'endpoint',
        `${baseUrl}/health`,
        new vscode.ThemeIcon('heart')
      ),
    ];

    if (config.enableOpenAI) {
      items.push(
        new ServerTreeItem(
          'OpenAI Chat',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.copyEndpoint',
            title: 'Copy Endpoint',
            arguments: [`${baseUrl}/v1/chat/completions`],
          },
          'endpoint',
          `${baseUrl}/v1/chat/completions`,
          new vscode.ThemeIcon('comment')
        ),
        new ServerTreeItem(
          'OpenAI Models',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.openEndpoint',
            title: 'Open Endpoint',
            arguments: [`${baseUrl}/v1/models`],
          },
          'endpoint',
          `${baseUrl}/v1/models`,
          new vscode.ThemeIcon('library')
        )
      );
    }

    if (config.enableAnthropic) {
      items.push(
        new ServerTreeItem(
          'Anthropic Messages',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.copyEndpoint',
            title: 'Copy Endpoint',
            arguments: [`${baseUrl}/v1/messages`],
          },
          'endpoint',
          `${baseUrl}/v1/messages`,
          new vscode.ThemeIcon('mail')
        )
      );
    }

    return items;
  }

  private getActionItems(): ServerTreeItem[] {
    const isRunning = this.server?.isRunning() ?? false;

    const items: ServerTreeItem[] = [];

    if (isRunning) {
      items.push(
        new ServerTreeItem(
          'Stop Server',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.stop',
            title: 'Stop Server',
          },
          'action',
          'Stop the HTTP server',
          new vscode.ThemeIcon('debug-stop')
        ),
        new ServerTreeItem(
          'Restart Server',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.restart',
            title: 'Restart Server',
          },
          'action',
          'Restart the HTTP server',
          new vscode.ThemeIcon('debug-restart')
        )
      );
    } else {
      items.push(
        new ServerTreeItem(
          'Start Server',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'vscodellmserver.start',
            title: 'Start Server',
          },
          'action',
          'Start the HTTP server',
          new vscode.ThemeIcon('debug-start')
        )
      );
    }

    items.push(
      new ServerTreeItem(
        'Set API Key',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.setApiKey',
          title: 'Set API Key',
        },
        'action',
        'Configure authentication key',
        new vscode.ThemeIcon('key')
      ),
      new ServerTreeItem(
        'Open Settings',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.openSettings',
          title: 'Open Settings',
        },
        'action',
        'Open extension settings',
        new vscode.ThemeIcon('settings')
      ),
      new ServerTreeItem(
        'Show Logs',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'vscodellmserver.showLogs',
          title: 'Show Logs',
        },
        'action',
        'View server logs',
        new vscode.ThemeIcon('output')
      )
    );

    return items;
  }
}

