export default class Queue {
  private autoplay_: boolean;
  get autoplay() { return this.autoplay_; }
  private shuffle_: boolean;
  get shuffle() { return this.shuffle_; }

  constructor(autoplay: boolean, shuffle: boolean) {
    this.autoplay_ = autoplay;
    this.shuffle_ = shuffle;
  }

  ToggleAutoplay() {
    //
  }

  ToggleShuffle() {
    //
  }
}