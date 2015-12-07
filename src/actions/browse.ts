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
                navigate([Factory.client.lastDir, result].join(Factory.settings.slash));
            else {
                let actionBox = () => {
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
                                navigate(Factory.client.lastDir);
                                
                            switch(index) {
                                case 0:
                                    navigate(Factory.client.lastDir);
                                break;
                                case 1:
                                    Factory.client.download(
                                        [Factory.client.lastDir, file].join(Factory.settings.slash),
                                        path.join(
                                            vscode.workspace.rootPath,
                                            Factory.client.lastDir.replace(Factory.settings.config.remote_path, ''), 
                                            file
                                        )
                                    ).then(
                                        result => {
                                            //
                                        },
                                        error => vscode.window.showWarningMessage(error.message || error)
                                    );
                                break;
                                case 2:
                                    let filename = file.split(Factory.settings.slash).pop(),
                                        tmpDir = path.join(vscode.workspace.rootPath, '.vscode', '.tmp'),
                                        tmpname = tmp.tmpNameSync({ 
                                            template: `${tmpDir}${path.sep}tmp-XXXXXX${path.extname(filename)}` 
                                        });
                                    
                                    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
                                    
                                    Factory.client.download(
                                        [Factory.client.lastDir, filename].join(Factory.settings.slash), 
                                        tmpname
                                    ).then(
                                        result => {
                                            vscode.workspace.openTextDocument(tmpname)
                                                            .then(result => vscode.window.showTextDocument(result));
                                        },
                                        error => vscode.window.showWarningMessage(error.message || error)
                                    );
                                break;
                                case 3:
                                    vscode.window.showInputBox({
                                        value: file
                                    }).then(
                                        result => {
                                            if (!result) return actionBox();
                                            
                                            Factory.client.rename(
                                                result, 
                                                [Factory.client.lastDir, file].join(Factory.settings.slash)
                                            ).then(
                                                result => navigate(Factory.client.lastDir),
                                                error => vscode.window.showWarningMessage(error.message || error)
                                            );
                                        },
                                        error => vscode.window.showWarningMessage(error.message || error)
                                    );
                                break;
                                case 4:
                                    let filePath: string = [Factory.client.lastDir, file].join(Factory.settings.slash),
                                        pick: Promise<string[]> = new Promise((resolve, reject) => resolve()).then(result => ['Yes', 'No']);
                                    
                                    vscode.window.showQuickPick(pick, {
                                        placeHolder: `Are you sure? (${filePath})`
                                    }).then(
                                        result => {
                                            if (result == 'Yes') {
                                                navigate(Factory.client.lastDir);
                                                Factory.client.rmFile(filePath).then(
                                                    result => true,
                                                    error => vscode.window.showWarningMessage(error.message || error)
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
                        value: Factory.client.lastDir
                    }).then(
                        result => {
                            if (!result) return navigate(Factory.client.lastDir);
                            navigate(result);
                        },
                        error => vscode.window.showWarningMessage(error.message || error)
                    );
                break;
                case 1:
                    let actionBox = () => {                        
                        let choises = [
                            '● Back to list',
                            '● New file',
                            '● New folder',
                            '● Rename',
                            '● Download',
                            '● Delete'
                        ];
                    
                        vscode.window.showQuickPick(choises, {
                            placeHolder: Factory.client.lastDir
                        }).then(
                            result => {
                                let index = choises.findIndex((value) => value == result);
                                
                                if (!result)
                                    navigate(Factory.client.lastDir);                                
                                
                                switch(index) {
                                    case 0:
                                        navigate(Factory.client.lastDir);
                                    break;
                                    case 1:
                                        vscode.window.showInputBox({
                                            placeHolder: 'File name'
                                        }).then(
                                            result => {
                                                if (!result) return actionBox();
                                                
                                                Factory.client.createFile(result).then(
                                                    result => navigate(Factory.client.lastDir),
                                                    error => vscode.window.showWarningMessage(error.message || error)
                                                );
                                            },
                                            error => vscode.window.showWarningMessage(error.message || error)
                                        );
                                    break;
                                    case 2:
                                        vscode.window.showInputBox({
                                            placeHolder: 'Folder name'
                                        }).then(
                                            result => {
                                                if (!result) return actionBox();
                                                
                                                Factory.client.mkDir(result).then(
                                                    result => navigate(Factory.client.lastDir),
                                                    error => vscode.window.showWarningMessage(error.message || error)
                                                );
                                            },
                                            error => vscode.window.showWarningMessage(error.message || error)
                                        );
                                    break;
                                    case 3:
                                        vscode.window.showInputBox({
                                            value: Factory.client.lastDir.split(Factory.settings.slash).pop()
                                        }).then(
                                            result => {
                                                if (!result) return actionBox();
                                                
                                                Factory.client.rename(result).then(
                                                    result => navigate(Factory.client.prevDir),
                                                    error => vscode.window.showWarningMessage(error.message || error)
                                                );
                                            },
                                            error => vscode.window.showWarningMessage(error.message || error)
                                        );
                                    break;    
                                    case 4:
                                        Factory.client.downloadDir(Factory.client.lastDir);
                                    break;                                                                                
                                    case 5:
                                        let pick: Promise<string[]> = new Promise((resolve, reject) => resolve())
                                            .then(result => ['Yes', 'No']);
                                        
                                        vscode.window.showQuickPick(pick, {
                                            placeHolder: `Are you sure? (${Factory.client.lastDir})`
                                        }).then(
                                            result => {
                                                if (result == 'Yes') {
                                                    Factory.client.rmDir().then(
                                                        result => navigate(Factory.client.prevDir),
                                                        error => vscode.window.showWarningMessage(error.message || error)
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
                    navigate([Factory.client.lastDir, '..'].join(Factory.settings.slash));
                break;
            }
        }            
    };
            
    let navigate = function(path) {
        Factory.status.loading(`Browse: ${path}`);
        
        Factory.client.connect()
            .then(
                result => Factory.client.navigate(path),
                error => vscode.window.showWarningMessage(error.message)
            )
            .then(
                result => {
                    Factory.status.dispose();                        
                    
                    if (result) {                            
                        let files = [
                            `${Factory.settings.config.host}:${Factory.client.lastDir}`,
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