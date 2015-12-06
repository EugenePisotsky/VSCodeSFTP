import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {Factory} from '../../src/factory';

var tmp = require('tmp');

export function actionBrowse() {
	let browser = function(files, result) {
		let index = files.findIndex((value) => value == result);
		let file = result;
		
		if (index > 2) {
			if (result.includes(Factory.settings.slash))
				navigate([Factory.sftp.lastDir, result].join(Factory.settings.slash));
			else {
				let actionBox = () => {
					/*
					* @TODO Download
					*/
					let choises = [
						'● Back to list',
						'● Download',
						'● Edit (remote)',
						'● Rename',
						'● Delete'
					];
					
					vscode.window.showQuickPick(choises, {
						placeHolder: result
					}).then(
						result => {
							let index = choises.findIndex((value) => value == result);
							
							if (!result)
								navigate(Factory.sftp.lastDir);
								
							switch(index) {
								case 0:
									navigate(Factory.sftp.lastDir);
								break;
								case 2:
									let filename = file.split(Factory.settings.slash).pop(),
										tmpDir = path.join(vscode.workspace.rootPath, '.vscode', '.tmp'),
										tmpname = tmp.tmpNameSync({ 
											template: `${tmpDir}tmp-XXXXXX${path.extname(filename)}` 
										});
									
									if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
									
									Factory.sftp.download(
										[Factory.sftp.lastDir, filename].join(Factory.settings.slash), 
										tmpname
									).then(
										result => {
											vscode.workspace.openTextDocument(tmpname)
															.then(result => vscode.window.showTextDocument(result));
										},
										error => vscode.window.showWarningMessage(error.message)
									);
								break;
								case 3:
									vscode.window.showInputBox({
										value: file
									}).then(
										result => {
											if (!result) return actionBox();
											
											Factory.sftp.rename(result, 
																[Factory.sftp.lastDir, file].join(Factory.settings.slash)
											).then(
												result => navigate(Factory.sftp.lastDir),
												error => console.log(error)
											);
										},
										error => console.log(error)
									);
								break;
								case 4:
									let filePath: string = [Factory.sftp.lastDir, file].join(Factory.settings.slash),
										pick: Promise<string[]> = new Promise((resolve, reject) => resolve())
																 .then(result => ['Yes', 'No']);
									
									vscode.window.showQuickPick(pick, {
										placeHolder: `Are you sure? (${filePath})`
									}).then(
										result => {
											if (result == 'Yes') {
												navigate(Factory.sftp.lastDir);
												Factory.sftp.rmFile(filePath).then(
													result => true,
													error => console.log(error)
												);
											} else
												return actionBox();
										}
									);								
								break;
							}
						},
						error => vscode.window.showWarningMessage(error.message)
					);
				};
				
				actionBox();									
			}
		} else {
			switch (index) {
				case 0:
					vscode.window.showInputBox({
						prompt: 'Browse to',
						value: Factory.sftp.lastDir
					}).then(
						result => {
							if (!result) return navigate(Factory.sftp.lastDir);
							navigate(result);
						},
						error => console.log(error)
					);
				break;
				case 1:
					let actionBox = () => {
						/*
						* @TODO Download
						*/						
						let choises = [
							'● Back to list',
							'● New file',
							'● New folder',
							'● Rename',
							'● Download',
							'● Delete'
						];
					
						vscode.window.showQuickPick(choises, {
							placeHolder: Factory.sftp.lastDir
						}).then(
							result => {
								let index = choises.findIndex((value) => value == result);
								
								if (!result)
									navigate(Factory.sftp.lastDir);								
								
								switch(index) {
									case 0:
										navigate(Factory.sftp.lastDir);
									break;
									case 1:
										vscode.window.showInputBox({
											placeHolder: 'File name'
										}).then(
											result => {
												if (!result) return actionBox();
												
												Factory.sftp.createFile(result).then(
													result => navigate(Factory.sftp.lastDir),
													error => console.log(error)
												);
											},
											error => console.log(error)
										);
									break;
									case 2:
										vscode.window.showInputBox({
											placeHolder: 'Folder name'
										}).then(
											result => {
												if (!result) return actionBox();
												
												Factory.sftp.mkDir(result).then(
													result => navigate(Factory.sftp.lastDir),
													error => console.log(error)
												);
											},
											error => console.log(error)
										);
									break;
									case 3:
										vscode.window.showInputBox({
											value: Factory.sftp.lastDir.split(Factory.settings.slash).pop()
										}).then(
											result => {
												if (!result) return actionBox();
												
												Factory.sftp.rename(result).then(
													result => navigate(Factory.sftp.prevDir),
													error => console.log(error)
												);
											},
											error => console.log(error)
										);
									break;	
									case 4:
										vscode.window.showInputBox({
											value: Factory.sftp.lastDir.split(Factory.settings.slash).pop()
										}).then(
											result => {
												if (!result) return actionBox();
												
												Factory.sftp.rename(result).then(
													result => navigate(Factory.sftp.prevDir),
													error => console.log(error)
												);
											},
											error => console.log(error)
										);
									break;																				
									case 5:
										let pick: Promise<string[]> = new Promise((resolve, reject) => resolve())
											.then(result => ['Yes', 'No']);
										
										vscode.window.showQuickPick(pick, {
											placeHolder: `Are you sure? (${Factory.sftp.lastDir})`
										}).then(
											result => {
												if (result == 'Yes') {
													navigate(Factory.sftp.prevDir);
													Factory.sftp.rmDir().then(
														result => true,
														error => console.log(error)
													);
												} else
													return actionBox();
											}
										);
									break;															
								}
							},
							error => vscode.window.showWarningMessage(error.message)
						);
					};
					
					actionBox();													
				break;
				case 2:
					navigate([Factory.sftp.lastDir, '..'].join(Factory.settings.slash));
				break;
			}
		}			
	};
			
	let navigate = function(path) {
		Factory.status.showLoading(`Browse: ${path}`);
		
		Factory.sftp.connect()
			.then(
				result => Factory.sftp.navigate(path),
				error => vscode.window.showWarningMessage(error.message)
			)
			.then(
				result => {
					Factory.status.dispose();						
					
					if (result) {							
						let files = [
							`${Factory.settings.config.host}:${Factory.sftp.lastDir}`,
							`● Folder actions`,
							`● Up a folder`,
							...result
						];
						
						vscode.window.showQuickPick(files, {
							placeHolder: 'Choose directory or file...'
						}).then(
							result => {
								if (result) {
									browser(files, result);
								}
							},
							error => vscode.window.showWarningMessage(error.message)
						);
					}
				},
				error => {
					Factory.status.dispose();
					vscode.window.showWarningMessage(error.message || error);
				}
			);
	};
	
	navigate(Factory.settings.config.remote_path);		
}