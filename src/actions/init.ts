import * as vscode from 'vscode';
import {Factory} from '../../src/factory';

export function actionInit() {
	let initResult = () => {
		vscode.window.showInformationMessage("Config file successfully created!");
		vscode.workspace.openTextDocument(Factory.settings.configFilePath)
						.then(result => vscode.window.showTextDocument(result));					
	}
	
	Factory.settings.check(exists => {
		if (exists) {
			let pick: Promise<string[]> = new Promise((resolve, reject) => resolve()).then(result => ['Yes', 'No']);
			
			vscode.window.showQuickPick(pick, {
				placeHolder: 'Config file already exists! Are you sure you want to overwrite your config?'
			}).then(
				result => {
					if (result == 'Yes')
						Factory.settings.init(() => initResult());
				}
			);
		} else Factory.settings.init(() => initResult());
	});	
}