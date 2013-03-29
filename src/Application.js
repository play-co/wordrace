import device;
import ui.View as View;
import ui.TextView as TextView;

DELIM = ":";
var JSONReader = function() {
    var chars = {'[':']','{':'}','"':'"'};
    var self = this;
    var cb = null;
    var unclosed = [];
    var buff = "";
    var checked = 0;
    var separate_events = function() {
        while (buff.length > checked) {
            if (unclosed.length > 0 && buff.charAt(checked) == unclosed[unclosed.length-1]) {
                unclosed.pop();
            }
            else if (buff.charAt(checked) in chars) {
                unclosed.push(chars[buff.charAt(checked)]);
            }
            checked += 1;
            if (buff && unclosed.length == 0) {
                cb(JSON.parse(buff.slice(0,checked)));
                buff = buff.slice(checked);
                checked = 0;
            }
        }
    }
    self.set_cb = function(func) {
        cb = func;
    }
    self.read = function(data) {
    	logger.log('received:', data);
        buff += data.slice(0, -2); // line breaks!
        separate_events();
    }
};
exports = Class(GC.Application, function () {

	this.initUI = function () {
		this.startBtn = new TextView({
			superview: this,
			layout: 'box',
			text: 'start',
			color: 'white',
			size: 50
		});
		this.startBtn.on('InputStart', bind(this, 'connect'));
		this.game = new View({
			superview: this,
			layout: 'box',
			canHandleEvents: false,
			visible: false
		});
		this.letters = [];
		var i, x = 0, w = device.width / 7;
		var letterBox = bind(this, function(num) {
			var tv = new TextView({
				superview: this.game,
				backgroundColor: 'red',
				x: 5 + num * w,
				y: 5,
				width: w - 10,
				height: w - 10,
				size: 50
			});
			tv.on('InputStart', bind(this, function() {
				this.tapLetter(num);
			}));
			return tv;
		});
		for (i = 0; i < 7; i++) {
			this.letters.push(letterBox(i));
		}
		this.word = new TextView({
			superview: this.game,
			layout: 'box',
			backgroundColor: 'pink',
			text: '',
			height: w,
			bottom: 0,
			size: 50
		});
		this.word.on('InputStart', bind(this, 'submit'));
		this.resetBtn = new TextView({
			superview: this.game,
			layout: 'box',
			backgroundColor: 'blue',
			text: 'RESET',
			height: w,
			width: w * 2,
			left: 0,
			centerY: true,
			size: 50
		});
		this.resetBtn.on('InputStart', bind(this, 'reset'));
		this.skipBtn = new TextView({
			superview: this.game,
			layout: 'box',
			backgroundColor: 'green',
			text: 'SKIP',
			height: w,
			width: w * 2,
			right: 0,
			centerY: true,
			size: 50
		});
		this.skipBtn.on('InputStart', bind(this, 'skip'));
	};

	this.send = function(data) {
		logger.log('sending:', data);
		this.sock.send(data + DELIM);
	};

	/*
	 * input event callbacks
	 */
	this.reset = function() {
		this.send("?");
	};

	this.skip = function() {
		this.send("!");
	};

	this.submit = function() {
		var w = this.word.getText();
		if (w.length > 2) {
			for (var i = 0; i < 7; i++) {
				this.letters[i].setText(this.letters[i].__letter);
			}
			this.send(w);
			this.word.setText("");
		}
	};

	this.tapLetter = function(num) {
		this.word.setText(this.word.getText() + this.letters[num].getText());
		this.letters[num].setText("");
	};

	this.connect = function() {
		logger.log("connect");
		this.reader = new JSONReader();
		this.reader.set_cb(bind(this, 'onRead'));
		import gc.native.socketTransport as socketTransport;
		this.sock = new socketTransport.Socket('10.1.0.17', 9999);
		this.sock.onError = bind(this, 'onError');
		this.sock.onClose = bind(this, 'onClose');
		this.sock.onConnect = bind(this, 'onConnect');
		this.sock.onRead = this.reader.read;
	};

	/*
	 * socket event callbacks
	 */
	this.onError = function() {
		logger.log("error");
	};

	this.onClose = function() {
		logger.log("close");
	};

	this.onConnect = function() {
		logger.log("connect");
		this.send('player' + ~~(Math.random() * 1000));
	};

	// event router
	this.onRead = function(data) {
		logger.log("read:", data);
        switch(data[0]) {
            case "SCORE": this.score(data[1]); break;
            case "WORD": this.newLetters(data[1]); break;
            case "ALERT": this.alert(data[1]); break;
            case "JOIN": this.join(data[1]); break;
            case "LEAVE": this.leave(data[1]); break;
            case "WELCOME": this.welcome(data[1]); break;
            case "SIGNEDIN": this.signedin(); break;
        }
	};

	/*
	 * read event handlers
	 */
	this.newLetters = function(data) {
		for (var i = 0; i < 7; i++) {
			this.letters[i].__letter = data[i];
			this.letters[i].setText(data[i]);
		}
	};

	this.alert = function(data) {
		logger.log(data);
	};

	this.score = function(data) {
		this.alert(data[0] + " has " + data[1] + " points!");
	};

	this.join = function(data) {
		this.alert(data[0] + " joined!");
	};

	this.leave = function(data) {
		this.alert(data + " left!");
	};

	this.welcome = function(data) {
		logger.log('welcome:', data);
		this.newLetters(data[0]);
	};

	this.signedin = function() {
		this.startBtn.removeFromSuperview();
		this.game.canHandleEvents(true);
		this.game.show();
	};
});