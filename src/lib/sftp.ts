import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {Factory} from '../../src/factory';

var mkdirp = require('mkdirp');

export class SFTP {
    fs = require('fs');
    Client = require('ssh2').Client;
    conn = new this.Client();
    connected = false;
    prevDir = '';
    lastDir = '';
    sftpConnection: any = false;
    
    public unload() {
        if (this.sftpConnection) {
            this.sftpConnection.end();
            this.sftpConnection = false;
        }
        if (this.connected) {
            this.conn.end();
            this.connected = false;
        }        
    }
    
    public connect() {        
        return new Promise<any>((resolve, reject) => {
            try {
                if (this.connected) {
                    resolve();
                } else {
                    console.log(`Connecting to ${Factory.settings.config.username}@${Factory.settings.config.host}`);
                    this.conn.on('ready', () => {
                            this.connected = true;
                            console.log(`Success connected to ${Factory.settings.config.username}@${Factory.settings.config.host}`);
                            resolve();
                        }).on('error', error => {
                            reject(error);
                        }).connect({
                            host: Factory.settings.config.host || 'localhost',
                            port: Factory.settings.config.port || 22,
                            username: Factory.settings.config.username || 'root',
                            privateKey: Factory.settings.config.private_key ? 
                                        require('fs').readFileSync(Factory.settings.config.private_key) : false    
                        }); 
                }
            }  catch (e) {
                reject(e.message);
            }
        });              
    }

    public download(path, dest) {
        return new Promise((resolve, reject) => {
            this.connect().then(
                result => this.sftp()
            ).then(
                result => {
                    this.sftpConnection.fastGet(path, dest, (err, handle) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });                        
                },
                error => reject(error)                
            );
        });
    }
    
    public copy(fullPath, path) {
        return new Promise((resolve, reject) => {
            let dir = (Factory.settings.config.remote_path + path).split(Factory.settings.slash);
            dir.pop();
            
            this.connect().then(
                result => this.sftp()
            ).then(
                result => this.exec(`mkdir -p ${dir.join(Factory.settings.slash)}`, true)
            ).then(
                result => {
                    this.sftpConnection.fastPut(fullPath, Factory.settings.config.remote_path + path, (err, handle) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });                        
                },
                error => reject(error)                
            );
        });
    }
    
    public downloadDir(p: string) {
        return new Promise((resolve, reject) => {
            let map = [];
            let pending = 1;
            
            let result = () => {
                for (let f of map) {
                    let [pathType, pathValue] = f;
                    console.log(pathType, path.join(vscode.workspace.rootPath, pathValue));
                    
                    if (pathType == 'dir') {
                        mkdirp(path.join(vscode.workspace.rootPath, pathValue));
                    } else {
                        this.sftpConnection.fastGet(
                            [Factory.settings.config.remote_path, pathValue].join(Factory.settings.slash),
                            path.join(vscode.workspace.rootPath, pathValue),
                            (err, handle) => {
                                // test
                            });
                    }
                }
                
                // resolve(map);
            }
            
            let create = (dir) => {
                map.push(['dir', dir.replace(Factory.settings.config.remote_path, '')]);
                
                this.sftpConnection.readdir(dir, (err, list) => {
                    if (list) {
                        pending += list.length;
                                        
                        for (let file of list) {
                            let newPath = [dir, file.filename].join(Factory.settings.slash);
                            
                            if (file['attrs'].isDirectory()) {
                                create(newPath);
                                
                                if (!pending) result();
                            } else {
                                pending -= 1;
                                map.push(['file', newPath.replace(Factory.settings.config.remote_path, '')]);
                            }
                        }
                        
                        pending -= 1; 
                        if (!pending) result();                    
                    }
                });
            };
            
            create(p);            
        });        
    }
    
    public rename(name: string, path: string = null) {
        return new Promise((resolve, reject) => {
            let dir = (path) ? path.split(Factory.settings.slash) : this.lastDir.split(Factory.settings.slash);
            dir.pop();
            dir.push(name);
            
            this.sftpConnection.rename((path) ? path : this.lastDir, dir.join(Factory.settings.slash), (err, handle) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });        
    }

    public rmDir() {
        return this.exec(`rm -rf ${this.lastDir}`);
    }
    
    public rmFile(file) {
        return this.exec(`rm ${file}`);
    }

    public mkDir(foldername: string) {
        return new Promise((resolve, reject) => {
            this.sftpConnection.mkdir([this.lastDir, foldername].join(Factory.settings.slash), (err, handle) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    
    public createFile(filename: string) {
        return new Promise((resolve, reject) => {
            this.sftpConnection.open([this.lastDir, filename].join(Factory.settings.slash), 'w', (err, handle) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    
    public navigate(dir: string) {
        dir = dir.replace(Factory.settings.slash + Factory.settings.slash, Factory.settings.slash);
        
        if (!this.prevDir.length)
            this.prevDir = dir;
        
        return new Promise<string[]>((resolve, reject) => {
            this.exec(`cd ${dir} && pwd`)
                .then(
                    result => {
                        if (this.lastDir.length)
                            this.prevDir = this.lastDir;
                        this.lastDir = result.trim();
                        
                        this.sftp()
                            .then(
                                result => {
                                    this.sftpConnection.readdir(dir, (err, list) => {
                                        if (err)
                                            reject(err);
                                        else {
                                            list = list.sort((a, b) => {
                                                if (a['attrs'].isDirectory() && !b['attrs'].isDirectory()) {
                                                    return -1;
                                                } else if(!a['attrs'].isDirectory() && b['attrs'].isDirectory()) {
                                                    return 1;
                                                }
                                                
                                                return 0;
                                            });
                                            
                                            let files = list.map(f => {
                                                return f['filename'] + (f['attrs'].isDirectory() ? Factory.settings.slash : '');
                                            });                                            
                                            
                                            resolve(files);
                                        }
                                    });
                                },
                                error => console.log(error)
                            );
                    },
                    error => reject(error)
                );
        });
    }
    
    public sftp() {
        return new Promise((resolve, reject) => {
            if (this.sftpConnection)
                resolve();
            else {
                console.log('Create SFTP connection');
                this.conn.sftp((err, sftp) => {
                    if (err)
                        reject(err);
                    else {
                        this.sftpConnection = sftp;
                        resolve();
                    }
                });
            }                
        });
    }
    
    public exec(cmd, continueExit=false) {
        return new Promise<string>((resolve, reject) => {
            let attempts = 0;
            
            let execute = () => {            
                this.conn.exec(cmd, (err, stream) => {
                    if (err) throw err;
                    stream.on('data', (data, stderr) => {
                        if (stderr)
                            reject(`error: ${data}`);
                        else
                            resolve(data.toString());
                            
                        stream.end();
                    }).on('exit', (code, signal) => {
                        if (continueExit) return resolve();
                        
                        if (attempts < 2) {
                            attempts++;
                            execute();
                        } else {
                            reject(`Exit with code ${code}`);
                        }
                        stream.end();
                    });
                });
            };
            
            execute();
        });        
    }
}