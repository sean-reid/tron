import { GameEngine } from './engine/GameEngine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element not found');

const game = new GameEngine(canvas);
game.start();
