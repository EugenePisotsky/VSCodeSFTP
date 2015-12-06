import * as vscode from 'vscode';

export class StatusBar {

    private _statusBarItem: vscode.StatusBarItem;

    public showLoading(message=null) {

        // Create as needed 
        if (!this._statusBarItem) { 
            this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left); 
        }  

        // Only update status if an MarkDown file 
        if (message) { 
            // Update the status bar
			let length = 1; 
			setInterval(() => {
				length++;
				if (length > 5)
					length = 1;
				
				let dots = new Array(length % 10).join('.');
				
				this._statusBarItem.text = message + dots;
				this._statusBarItem.show();
			}, 300); 
        } else { 
            this._statusBarItem.hide(); 
        } 
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}