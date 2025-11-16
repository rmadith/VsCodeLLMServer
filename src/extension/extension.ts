/**
 * VS Code LLM Server Extension Entry Point
 */

import * as vscode from 'vscode';
import { VsCodeLmHandler } from '../handlers/vsCodeLmHandler';
import { LLMServer } from './server';
import { ServerTreeProvider } from './serverTreeView';
import { getServerConfig, getApiKey, validateConfig } from '../utils/config';
import { logger } from '../utils/logger';

let server: LLMServer | null = null;
let handler: VsCodeLmHandler | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let treeDataProvider: ServerTreeProvider | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('Activating VS Code LLM Server extension');

  try {
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'vscodellmserver.showMenu';
    context.subscriptions.push(statusBarItem);

    // Get configuration
    const config = getServerConfig();
    logger.setLogLevel(config.logLevel);

    // Validate configuration
    const errors = validateConfig(config);
    if (errors.length > 0) {
      const errorMsg = `Configuration errors: ${errors.join(', ')}`;
      logger.error(errorMsg);
      vscode.window.showErrorMessage(errorMsg);
      return;
    }

    // Get API key
    const apiKey = await getApiKey(context);

    if (config.enableAuth && !apiKey) {
      const message = 'API key is not configured. Authentication is enabled but no key is set.';
      logger.warn(message);
      
      const action = await vscode.window.showWarningMessage(
        message,
        'Set API Key',
        'Disable Auth',
        'Continue Anyway'
      );

      if (action === 'Set API Key') {
        await vscode.commands.executeCommand('vscodellmserver.setApiKey');
        return;
      } else if (action === 'Disable Auth') {
        await vscode.workspace.getConfiguration('vscodellmserver').update('enableAuth', false, true);
        // Reload configuration
        return activate(context);
      }
    }

    // Initialize VS Code LM Handler
    handler = new VsCodeLmHandler({
      vsCodeLmModelSelector: config.modelSelector,
    });

    // Initialize and start server
    server = new LLMServer(handler, config, context, apiKey);
    context.subscriptions.push(server);

    await server.start();

    // Update status bar
    updateStatusBar(true, config.port);

    // Create tree view
    treeDataProvider = new ServerTreeProvider(server, context);
    const treeView = vscode.window.createTreeView('vscodellmserver-sidebar', {
      treeDataProvider: treeDataProvider,
      showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // Register commands
    registerCommands(context);

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (event: vscode.ConfigurationChangeEvent) => {
        if (event.affectsConfiguration('vscodellmserver')) {
          logger.info('Configuration changed, restarting server');
          await restartServer(context);
        }
      })
    );

    logger.info('VS Code LLM Server extension activated successfully');
  } catch (error) {
    const errorMsg = `Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    vscode.window.showErrorMessage(errorMsg);
    updateStatusBar(false);
  }
}

/**
 * Extension deactivation
 */
export async function deactivate(): Promise<void> {
  logger.info('Deactivating VS Code LLM Server extension');

  if (server) {
    await server.stop();
    server = null;
  }

  if (handler) {
    handler.dispose();
    handler = null;
  }

  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }

  logger.info('VS Code LLM Server extension deactivated');
}

/**
 * Register commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Start server command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.start', async () => {
      try {
        if (server && server.isRunning()) {
          vscode.window.showInformationMessage('Server is already running');
          return;
        }

        if (!server) {
          const config = getServerConfig();
          const apiKey = await getApiKey(context);
          
          if (!handler) {
            handler = new VsCodeLmHandler({
              vsCodeLmModelSelector: config.modelSelector,
            });
          }

          server = new LLMServer(handler, config, context, apiKey);
          context.subscriptions.push(server);
        }

        await server.start();
        const config = getServerConfig();
        updateStatusBar(true, config.port);
        treeDataProvider?.updateServer(server);
        treeDataProvider?.refresh();
        vscode.window.showInformationMessage('VS Code LLM Server started');
      } catch (error) {
        const errorMsg = `Failed to start server: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        vscode.window.showErrorMessage(errorMsg);
        updateStatusBar(false);
        treeDataProvider?.refresh();
      }
    })
  );

  // Stop server command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.stop', async () => {
      try {
        if (!server || !server.isRunning()) {
          vscode.window.showInformationMessage('Server is not running');
          return;
        }

        await server.stop();
        updateStatusBar(false);
        treeDataProvider?.refresh();
        vscode.window.showInformationMessage('VS Code LLM Server stopped');
      } catch (error) {
        const errorMsg = `Failed to stop server: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        vscode.window.showErrorMessage(errorMsg);
      }
    })
  );

  // Restart server command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.restart', async () => {
      await restartServer(context);
    })
  );

  // Show logs command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.showLogs', () => {
      // Open output channel or show instruction
      vscode.window.showInformationMessage(
        'Logs are output to the Debug Console. Open with View > Debug Console.'
      );
    })
  );

  // Set API key command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.setApiKey', async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter API key for authentication',
        password: true,
        placeHolder: 'sk-...',
      });

      if (apiKey) {
        await context.secrets.store('vscodellmserver.apiKey', apiKey);
        vscode.window.showInformationMessage('API key saved successfully');
        
        // Restart server if running
        if (server && server.isRunning()) {
          await restartServer(context);
        }
      }
    })
  );

  // Show menu command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.showMenu', async () => {
      const config = getServerConfig();
      const isRunning = server?.isRunning() ?? false;

      const items = [
        {
          label: isRunning ? '$(debug-stop) Stop Server' : '$(debug-start) Start Server',
          command: isRunning ? 'vscodellmserver.stop' : 'vscodellmserver.start',
        },
        {
          label: '$(debug-restart) Restart Server',
          command: 'vscodellmserver.restart',
        },
        {
          label: '$(key) Set API Key',
          command: 'vscodellmserver.setApiKey',
        },
        {
          label: '$(output) Show Logs',
          command: 'vscodellmserver.showLogs',
        },
        {
          label: '$(gear) Open Settings',
          command: 'workbench.action.openSettings',
          args: 'vscodellmserver',
        },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `VS Code LLM Server (${isRunning ? `Running on port ${config.port}` : 'Stopped'})`,
      });

      if (selected) {
        if (selected.command === 'workbench.action.openSettings') {
          await vscode.commands.executeCommand(selected.command, selected.args);
        } else {
          await vscode.commands.executeCommand(selected.command);
        }
      }
    })
  );

  // Change port command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.changePort', async () => {
      const config = getServerConfig();
      const newPort = await vscode.window.showInputBox({
        prompt: 'Enter new port number',
        value: config.port.toString(),
        validateInput: (value) => {
          const port = parseInt(value);
          if (isNaN(port) || port < 1 || port > 65535) {
            return 'Port must be between 1 and 65535';
          }
          return null;
        },
      });

      if (newPort) {
        await vscode.workspace.getConfiguration('vscodellmserver').update('port', parseInt(newPort), true);
        vscode.window.showInformationMessage(`Port changed to ${newPort}. Restart server for changes to take effect.`);
        treeDataProvider?.refresh();
      }
    })
  );

  // Change host command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.changeHost', async () => {
      const config = getServerConfig();
      const newHost = await vscode.window.showInputBox({
        prompt: 'Enter new host address',
        value: config.host,
        placeHolder: '127.0.0.1 or 0.0.0.0',
      });

      if (newHost) {
        await vscode.workspace.getConfiguration('vscodellmserver').update('host', newHost, true);
        vscode.window.showInformationMessage(`Host changed to ${newHost}. Restart server for changes to take effect.`);
        treeDataProvider?.refresh();
      }
    })
  );

  // Toggle authentication command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.toggleAuth', async () => {
      const config = getServerConfig();
      const newValue = !config.enableAuth;
      await vscode.workspace.getConfiguration('vscodellmserver').update('enableAuth', newValue, true);
      vscode.window.showInformationMessage(`Authentication ${newValue ? 'enabled' : 'disabled'}. Restart server for changes to take effect.`);
      treeDataProvider?.refresh();
    })
  );

  // Change rate limit command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.changeRateLimit', async () => {
      const config = getServerConfig();
      const newLimit = await vscode.window.showInputBox({
        prompt: 'Enter rate limit (requests per minute, 0 to disable)',
        value: config.rateLimit.toString(),
        validateInput: (value) => {
          const limit = parseInt(value);
          if (isNaN(limit) || limit < 0) {
            return 'Rate limit must be non-negative';
          }
          return null;
        },
      });

      if (newLimit !== undefined) {
        await vscode.workspace.getConfiguration('vscodellmserver').update('rateLimit', parseInt(newLimit), true);
        vscode.window.showInformationMessage(`Rate limit changed to ${newLimit}/min. Restart server for changes to take effect.`);
        treeDataProvider?.refresh();
      }
    })
  );

  // Change log level command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.changeLogLevel', async () => {
      const levels = ['debug', 'info', 'warn', 'error'];
      const selected = await vscode.window.showQuickPick(levels, {
        placeHolder: 'Select log level',
      });

      if (selected) {
        await vscode.workspace.getConfiguration('vscodellmserver').update('logLevel', selected, true);
        logger.setLogLevel(selected as 'debug' | 'info' | 'warn' | 'error');
        vscode.window.showInformationMessage(`Log level changed to ${selected}`);
        treeDataProvider?.refresh();
      }
    })
  );

  // Toggle OpenAI endpoints command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.toggleOpenAI', async () => {
      const config = getServerConfig();
      const newValue = !config.enableOpenAI;
      await vscode.workspace.getConfiguration('vscodellmserver').update('enableOpenAI', newValue, true);
      vscode.window.showInformationMessage(`OpenAI endpoints ${newValue ? 'enabled' : 'disabled'}. Restart server for changes to take effect.`);
      treeDataProvider?.refresh();
    })
  );

  // Toggle Anthropic endpoints command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.toggleAnthropic', async () => {
      const config = getServerConfig();
      const newValue = !config.enableAnthropic;
      await vscode.workspace.getConfiguration('vscodellmserver').update('enableAnthropic', newValue, true);
      vscode.window.showInformationMessage(`Anthropic endpoints ${newValue ? 'enabled' : 'disabled'}. Restart server for changes to take effect.`);
      treeDataProvider?.refresh();
    })
  );

  // Open endpoint command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.openEndpoint', async (url: string) => {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  // Copy endpoint command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.copyEndpoint', async (url: string) => {
      await vscode.env.clipboard.writeText(url);
      vscode.window.showInformationMessage(`Copied to clipboard: ${url}`);
    })
  );

  // Copy URL command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.copyUrl', async () => {
      const config = getServerConfig();
      const url = `http://${config.host}:${config.port}`;
      await vscode.env.clipboard.writeText(url);
      vscode.window.showInformationMessage(`Copied to clipboard: ${url}`);
    })
  );

  // Open settings command
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodellmserver.openSettings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'vscodellmserver');
    })
  );
}

/**
 * Restart server
 */
async function restartServer(context: vscode.ExtensionContext): Promise<void> {
  try {
    logger.info('Restarting server');

    if (server) {
      await server.stop();
    }

    if (handler) {
      handler.dispose();
    }

    // Get fresh configuration
    const config = getServerConfig();
    const apiKey = await getApiKey(context);

    // Reinitialize handler and server
    handler = new VsCodeLmHandler({
      vsCodeLmModelSelector: config.modelSelector,
    });

    server = new LLMServer(handler, config, context, apiKey);
    await server.start();

    updateStatusBar(true, config.port);
    treeDataProvider?.updateServer(server);
    treeDataProvider?.refresh();
    vscode.window.showInformationMessage('VS Code LLM Server restarted');
  } catch (error) {
    const errorMsg = `Failed to restart server: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    vscode.window.showErrorMessage(errorMsg);
    updateStatusBar(false);
    treeDataProvider?.refresh();
  }
}

/**
 * Update status bar
 */
function updateStatusBar(isRunning: boolean, port?: number): void {
  if (!statusBarItem) {
    return;
  }

  if (isRunning && port) {
    statusBarItem.text = `$(radio-tower) LLM Server :${port}`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.tooltip = `VS Code LLM Server running on port ${port}\nClick for options`;
  } else {
    statusBarItem.text = '$(radio-tower) LLM Server';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.tooltip = 'VS Code LLM Server stopped\nClick for options';
  }

  statusBarItem.show();
}

