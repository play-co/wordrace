import rel, random
rel.override()
from dez.network.server import SocketDaemon
from dez.json import encode

PORT = 9999
DELIM = ":"
LETTERS = 'a'*9+'b'*2+'c'*2+'d'*4+'e'*12+'f'*2+'g'*3+'h'*2+'i'*9+'j'*1+'k'*1+'l'*4+'m'*2+'n'*6+'o'*8+'p'*2+'q'*1+'r'*6+'s'*4+'t'*6+'u'*4+'v'*2+'w'*2+'x'*1+'y'*2+'z'*1

f = open('words','r')
words = set(f.read().split('\n'))
f.close()

def score_sort(a,b):
    return cmp(a[1], b[1])

def get_letter():
    return random.choice(LETTERS)

class Race(object):
    def __init__(self):
        self.server = SocketDaemon('', PORT, self.__new_conn)
        self.conns = set()
        self.leaving = set()
        self.names = set()
        self.reset_current()

    def reset_current(self):
        self.current = ''.join([get_letter() for i in range(7)])
        self.wordcast()

    def __new_conn(self, conn):
        rc = RaceConn(conn, self)
        self.conns.add(rc)
        conn.set_close_cb(self.close_cb, [rc])

    def close_cb(self, conn):
        conn.remove()
        self.leaving.add(conn)
        if conn.name:
            self.names.remove(conn.name)
            self.broadcast(["LEAVE", conn.name])

    def alertcast(self, msg):
        self.broadcast(["ALERT", msg])

    def joincast(self, player):
        self.names.add(player.name)
        self.broadcast(["JOIN", [player.name, player.score]])

    def scorecast(self, player):
        self.broadcast(["SCORE", [player.name, player.score]])

    def wordcast(self):
        self.broadcast(["WORD", self.current])

    def broadcast(self, msg):
        msg = encode(msg)
        for conn in self.leaving:
            self.conns.remove(conn)
        self.leaving.clear()
        for conn in self.conns:
            conn.send(msg)

    def start(self):
        self.server.start()

class RaceConn(object):
    def __init__(self, conn, race):
        self.conn = conn
        self.race = race
        self.conn.set_rmode_delimiter(DELIM, self.__parse_input)
        self.name = None
        self.score = 0
        self.active = True
        players = [[player.name, player.score] for player in self.race.conns if player.name]
        players.sort(score_sort)
        self.send(encode(["WELCOME", [self.race.current, players]]))

    def __parse_input(self, word):
        print "receiving:", word
        if not self.name:
            if word in self.race.names:
                return self.alert("<b>%s</b> is taken"%word)
            self.name = word
            self.signedin()
            return self.race.joincast(self)
        if word == "!":
            self.race.reset_current()
            return self.race.alertcast("<b>%s</b> makes new letters"%self.name)
        if word == "?":
            self.score = 0
            self.race.scorecast(self)
            return self.race.alertcast("<b>%s</b> resets score :("%(self.name))
        if word not in words:
            return self.alert("<b>%s</b> is not a word"%word)
        new = self.race.current
        for letter in word:
            if letter not in new:
                return self.alert("<b>%s</b> isn't here"%word)
            new = new.replace(letter, get_letter(), 1)
        self.race.current = new
        self.race.wordcast()
        pts = 2**len(word)
        self.score += pts
        self.race.scorecast(self)
        self.race.alertcast("<b>%s</b> gets <b>%s</b> points for <b>%s</b>!"%(self.name, str(pts), word))

    def signedin(self):
        self.send(encode(["SIGNEDIN"]))

    def alert(self, msg):
        self.send(encode(["ALERT", msg]))

    def send(self, msg):
        print "sending:", msg
        if self.active:
            self.conn.write(msg)

    def remove(self):
        self.active = False

if __name__ == "__main__":
    print "running WordRace on port %s"%PORT
    server = Race()
    server.start()