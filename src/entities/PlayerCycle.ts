import { Cycle } from './Cycle';
import type { Arena } from '../engine/Arena';
import type { InputManager } from '../systems/InputManager';
import type { Direction, GridPos } from '../types';

export class PlayerCycle extends Cycle {
  private input: InputManager;

  constructor(id: number, color: string, startPos: GridPos, startDir: Direction, input: InputManager) {
    super(id, color, startPos, startDir);
    this.input = input;
  }

  chooseDirection(_arena: Arena, _opponents: GridPos[]): void {
    const dir = this.input.consumeDirection();
    if (dir !== null) {
      this.pendingDir = dir;
    }
  }
}
