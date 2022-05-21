// Pollyfill for the Reflect API (Just in case)
import "core-js/proposals/reflect-metadata";
import { container } from "tsyringe";

// The module 'vscode' contains the VS Code extensibility API
import { ExtensionContext } from 'vscode';

import { CommandHelper, ConfigHelper, ExtensionHelper, ProfileHelper } from '@extension/helpers';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

   // Register all services and types to the DI container
   container.registerInstance<ExtensionContext>("ExtensionContext", context);
   
   container.registerSingleton<CommandHelper>(CommandHelper);
   container.registerSingleton<ConfigHelper>(ConfigHelper);
   container.registerSingleton<ProfileHelper>(ProfileHelper);
   container.registerSingleton<ExtensionHelper>(ExtensionHelper);

   // Get the command helper
   const commandHelper = container.resolve<CommandHelper>(CommandHelper);
   // Register available commands
   commandHelper.registerCommands();
}

// this method is called when your extension is deactivated
export function deactivate() {}
