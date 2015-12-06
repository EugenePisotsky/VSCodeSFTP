import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {Factory} from '../../src/factory';

var mkdirp = require('mkdirp');

export class FTP {
    fs = require('fs');
    Client = require('ftp');
    connected = false;
    prevDir = '';
    lastDir = '';    
    conn = new this.Client();
    
    public unload() {
        if (this.connected) {
            this.conn.logout();
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
                        });
                        
                    this.conn.on('error', e => {
                        reject(e);
                    });
                        
                    this.conn.connect({
                        host: Factory.settings.config.host || 'localhost',
                        port: Factory.settings.config.port || 21,
                        user: Factory.settings.config.username || 'anonymous',
                        password: Factory.settings.config.password || 'anonymous@'   
                    });
                }
            }  catch (e) {
                reject(e.message);
            }
        });        
    }

    public download(path, dest) {
        return new Promise((resolve, reject) => {
            this.conn.get(path, (err, fileStream) => {
                if (err)
                    return reject(err);
                
                var result = '';
                fileStream.on('data', (buffer) => {
                    result += buffer.toString();
                });
                               
                fileStream.on('end', () => {
                    fs.writeFile(dest, result, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            });
        });
    }
    
    public copy(fullPath, path) {
        return new Promise((resolve, reject) => {
            this.connect().then(
                result => {
                    this.conn.put(fullPath, Factory.settings.config.remote_path + path, err => {
                        if (err)
                            return reject(err);
                        
                        resolve();
                    });                    
                }
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
                        this.download(
                            [Factory.settings.config.remote_path, pathValue].join(Factory.settings.slash),
                            path.join(vscode.workspace.rootPath, pathValue)
                        );
                    }
                }
                
                // resolve(map);
            }
            
            let create = (dir) => {
                map.push(['dir', dir.replace(Factory.settings.config.remote_path, '')]);
                
                this.conn.list(dir, (err, list) => {
                    if (list) {
                        pending += list.length;
                                        
                        for (let file of list) {
                            let newPath = [dir, file.name].join(Factory.settings.slash);
                            
                            if (file['type'] == 'd') {
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
            
            this.conn.rename((path) ? path : this.lastDir, dir.join(Factory.settings.slash), err => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }

    public rmDir() {
        return new Promise<string>((resolve, reject) => {
            this.conn.rmdir(this.lastDir, true, err => {
                if (err)
                    return reject(err);
                    
                resolve();
            });
        });
    }
    
    public rmFile(file) {
        return new Promise<string>((resolve, reject) => {
            this.conn.delete(file, err => {
                if (err)
                    return reject(err);
                    
                resolve();
            });
        });
    }

    public mkDir(foldername: string) {
        return new Promise((resolve, reject) => {
            this.conn.mkdir([this.lastDir, foldername].join(Factory.settings.slash), (err, handle) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    
    public createFile(filename: string) {
        return new Promise((resolve, reject) => {
            this.conn.put('', [this.lastDir, filename].join(Factory.settings.slash), (err, handle) => {
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
            this.conn.list(dir, (err, list) => {
                this.conn.cwd(dir, (err, currentDir) => {
                    this.conn.pwd((err, cwd) => {
                        if (this.lastDir.length)
                            this.prevDir = this.lastDir;
                        this.lastDir = cwd.trim();         
                        
                        if (err)
                            reject(err);
                        else {
                            list = list.sort((a, b) => {
                                if (a['type'] == 'd' && b['type'] != 'd') {
                                    return -1;
                                } else if(a['type'] != 'd' && b['type'] == 'd') {
                                    return 1;
                                }
                                
                                return 0;
                            });
                            
                            let files = list.map(f => {
                                return f['name'] + (f['type'] == 'd' ? Factory.settings.slash : '');
                            });
                            
                            resolve(files);
                        } 
                    });
                });               
            });
        });
    }
}