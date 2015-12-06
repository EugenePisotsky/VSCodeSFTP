import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Settings {
    stripJsonComments = require('strip-json-comments');
    
    configPath: string = path.join(vscode.workspace.rootPath, '.vscode');
    configFile: string = `sftp-pro.json`;
    configFilePath: string = path.join(this.configPath, this.configFile);
    slash: string = '/';
    
    config: {
        upload_on_save?: boolean,
        host?: string,
        user?: string,
        password?: string,
        port?: string,
        remote_path?: string,
        private_key?: string
    } = {};
    
	defaultConfig: string = `{
    // SFTP default config
    
    // sftp, ftp or ftps
    "type": "sftp",
    
    "upload_on_save": true,
    
    "host": "example.com",
    "username": "username",
    //"password": "password",
    //"port": "22",
    
    "remote_path": "/path/to/project/",
    "ignore_regexes": [
        ".git", ".vscode"
    ],
    
    "private_key": "",

    "connect_timeout": 30
}`;

	public init(callback: () => any) {
        fs.exists(this.configPath, (exists) => {
            if (exists) {
                this.createDefaultConfig(callback);
            } else {
                fs.mkdir(this.configPath, () => this.createDefaultConfig(callback));
            }
        });
	}
    
    public initConfig() {
        if (fs.existsSync(this.configFilePath)) {
            this.config = JSON.parse(this.stripJsonComments(fs.readFileSync(this.configFilePath, 'utf8')));
            if (this.config.remote_path.includes("\\")) {
                this.slash = "\\";
            }
        }
    }
    
    private createDefaultConfig(callback: () => any) {
		fs.writeFile(this.configFilePath, this.defaultConfig, (err) => {
			if(err) {
				return console.log(err);
			}
		
			callback();
		});
    }
    
    public check(callback: (exists: boolean) => any) {
        fs.exists(this.configFilePath, (exists) => {
            callback(exists);
        });
    }

}