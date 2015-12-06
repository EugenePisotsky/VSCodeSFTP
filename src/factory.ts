import {StatusBar} from '../src/lib/status';
import {SFTP} from '../src/lib/sftp';
import {Settings} from '../src/lib/settings';

export class Factory {
    static status: StatusBar = new StatusBar();
    static settings: Settings = new Settings();
    static sftp: SFTP = new SFTP();
}