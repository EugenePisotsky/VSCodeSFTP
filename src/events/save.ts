import * as vscode from 'vscode';
import {Factory} from '../../src/factory';

export function eventSave(e) {
	if (e.fileName.includes(Factory.settings.configFile)) {
		vscode.window.showInformationMessage("Config successfully updated!");
		Factory.settings.initConfig();
		Factory.sftp.unload();
	}
	
	Factory.sftp.copy(e.fileName, e.fileName.replace(vscode.workspace.rootPath, '')).then(
		result => {
			//
		},
		error => console.log(error)
	);	
}