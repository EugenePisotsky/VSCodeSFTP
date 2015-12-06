import {StatusBar} from '../src/lib/status';
import {Settings} from '../src/lib/settings';

export class Factory {
    static status: StatusBar = new StatusBar();
    static settings: Settings = new Settings();
    static client = null;
    
    static setClient(client) {
        this.client = client;
    }
}