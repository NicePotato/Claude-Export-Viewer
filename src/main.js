import { html, render } from './lib/ui.js';
import { App } from './App.js';

render(html`<${App} />`, document.getElementById('app'));
