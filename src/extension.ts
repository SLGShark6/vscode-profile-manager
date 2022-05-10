// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

import { ConfigHelper } from './helpers';
import { constants } from "@extension";
import { ProfileHelper } from './helpers/profile.helper';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

   // ToDo wrap this conditionally with whether this is startup
   // ToDo set this conditionally from the config helper 
   vscode.commands.executeCommand('setContext', `${constants.internalName}.profileLoaded`, true);

	context.subscriptions.push(
      vscode.commands.registerCommand(`${constants.internalName}.saveProfile`, async () => {
		   await saveProfileHandler();
	   })
   );

   context.subscriptions.push(
      vscode.commands.registerCommand(`${constants.internalName}.loadProfile`, async () => {
		   await loadProfileHandler();
	   })
   );
}

// this method is called when your extension is deactivated
export function deactivate() {}


async function saveProfileHandler() {
   let helper = new ProfileHelper();

   await helper.saveProfile("");
}

async function loadProfileHandler() {
   let helper = new ProfileHelper();

   await helper.loadProfile("");
}
