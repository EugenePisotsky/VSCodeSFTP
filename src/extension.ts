import * as vscode from 'vscode';
import {Factory} from '../src/factory';

import {eventSave} from '../src/events/save';

import {actionInit} from '../src/actions/init';
import {actionBrowse} from '../src/actions/browse';

export function activate(context: vscode.ExtensionContext) {		
	Factory.settings.initConfig();
	
	vscode.workspace.onDidSaveTextDocument(e => eventSave(e));

	vscode.commands.registerCommand('extension.init', () => actionInit());
	vscode.commands.registerCommand('extension.browse', () => actionBrowse());
}