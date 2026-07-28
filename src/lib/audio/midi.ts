// MIDI Input — Web MIDI API integration for hardware keyboard input.
// Handles note on/off, CC, pitch bend, and aftertouch.

export interface MIDINote {
  note: number; // 0-127
  velocity: number; // 0-127
  channel: number;
}

export interface MIDICC {
  controller: number;
  value: number;
  channel: number;
}

export type MIDIEventHandler = {
  onNoteOn?: (note: MIDINote) => void;
  onNoteOff?: (note: MIDINote) => void;
  onCC?: (cc: MIDICC) => void;
  onPitchBend?: (value: number, channel: number) => void;
  onAftertouch?: (note: number, pressure: number, channel: number) => void;
};

export class MIDIInput {
  private access: MIDIAccess | null = null;
  private inputs: globalThis.MIDIInput[] = [];
  private handler: MIDIEventHandler = {};
  connected = false;

  async init(handler: MIDIEventHandler): Promise<boolean> {
    this.handler = handler;
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported in this browser");
      return false;
    }
    try {
      this.access = await navigator.requestMIDIAccess();
      this.connected = true;
      this.refreshInputs();
      this.access.onstatechange = () => this.refreshInputs();
      return true;
    } catch (e) {
      console.warn("MIDI access denied:", e);
      return false;
    }
  }

  private refreshInputs() {
    if (!this.access) return;
    this.inputs = [];
    this.access.inputs.forEach((input) => {
      input.onmidimessage = (e) => this.handleMessage(e);
      this.inputs.push(input);
    });
  }

  private handleMessage(e: MIDIMessageEvent) {
    if (!e.data) return;
    const [status, data1, data2] = e.data;
    const command = status & 0xf0;
    const channel = status & 0x0f;

    switch (command) {
      case 0x90: // Note on
        if (data2 > 0) {
          this.handler.onNoteOn?.({ note: data1, velocity: data2, channel });
        } else {
          this.handler.onNoteOff?.({ note: data1, velocity: 0, channel });
        }
        break;
      case 0x80: // Note off
        this.handler.onNoteOff?.({ note: data1, velocity: data2, channel });
        break;
      case 0xb0: // CC
        this.handler.onCC?.({ controller: data1, value: data2, channel });
        break;
      case 0xe0: // Pitch bend
        this.handler.onPitchBend?.((data2 << 7) + data1 - 8192, channel);
        break;
      case 0xa0: // Aftertouch
        this.handler.onAftertouch?.(data1, data2, channel);
        break;
    }
  }

  getInputNames(): string[] {
    return this.inputs.map((i) => i.name ?? "Unknown");
  }

  isSupported(): boolean {
    return !!navigator.requestMIDIAccess;
  }

  disconnect() {
    this.inputs.forEach((i) => (i.onmidimessage = null));
    this.inputs = [];
    if (this.access) this.access.onstatechange = null;
    this.connected = false;
  }
}

export const midiInput = new MIDIInput();

// Convert MIDI note number to note name
export function midiToNoteName(note: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(note / 12) - 1;
  return `${names[note % 12]}${octave}`;
}

// Convert MIDI note number to frequency
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}
