class DebrisPlayer {
  constructor(element) {
    this.element = element;
    this.playList = []; // Just URLs for now. Future: timestamps, skips, etc.
    this.playPosition = -1;

    let self = this;
    this.element.addEventListener('ended', (event) => {
      self.playNext();
    });
  }

  playNext(delta) {
    delta ||= 1
    let playListLength = this.playList.length;

    if (playListLength == 0) return console.debug('the playList is empty!');
    if (!this.playList[this.playPosition + delta])
      return console.debug('end of the playList!');

    this.playPosition += delta;
    let nextTrack = this.playList[this.playPosition];
    this.element.src = nextTrack;
    console.debug(`Now playing ${nextTrack}`);
  }
}

// Consider this for localStorage seralize/deserialize:
// https://stackoverflow.com/a/4762411/73779

window.addEventListener('load', (event) => {
  window.player = new DebrisPlayer(document.getElementById("player"));
});
