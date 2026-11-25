/**
 * Punkt wejścia aplikacji CivisLex.
 * Application entry point.
 */

import './styles/main.css';
import { startApp } from './ui/app';

const root = document.getElementById('app');
if (root) startApp(root);
