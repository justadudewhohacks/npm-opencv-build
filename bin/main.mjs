#!/usr/bin/env node
import { OpenCVBuilder } from "../dist/esm/OpenCVBuilder.js";
void new OpenCVBuilder(process.argv).install();