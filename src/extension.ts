// Pollyfill for the Reflect API (Just in case)
import "core-js/proposals/reflect-metadata";
import { container } from "tsyringe";

// The module 'vscode' contains the VS Code extensibility API
import { ExtensionContext, commands } from 'vscode';

import * as constants from "@extension";
import { ConfigHelper, ExtensionHelper, ProfileHelper } from '@extension/helpers';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

   container.registerSingleton<ConfigHelper>(ConfigHelper);
   container.registerSingleton<ProfileHelper>(ProfileHelper);
   container.registerSingleton<ExtensionHelper>(ExtensionHelper);

   container.registerInstance<ExtensionContext>("ExtensionContext", context);
   

   // let helper = container.resolve<ProfileHelper>(ProfileHelper);


   // ToDo wrap this conditionally with whether this is startup
   // ToDo set this conditionally from the config helper 
   commands.executeCommand('setContext', `${constants.internalName}.profileLoaded`, true);

	context.subscriptions.push(
      commands.registerCommand(`${constants.internalName}.saveProfile`, async () => {
         await saveProfileHandler();
	   })
   );

   context.subscriptions.push(
      commands.registerCommand(`${constants.internalName}.loadProfile`, async () => {
		   await loadProfileHandler();
	   })
   );
}

// this method is called when your extension is deactivated
export function deactivate() {}


async function saveProfileHandler() {
   let helper = container.resolve<ProfileHelper>(ProfileHelper);

   helper.saveProfile("Test");
}

async function loadProfileHandler() {
   let helper = container.resolve<ProfileHelper>(ProfileHelper);

   await helper.loadProfile("");
}
