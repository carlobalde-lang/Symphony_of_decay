const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const planck = require('../vendor/planck-1.3.0.min.js');
const root = path.join(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
let passed = 0;
function test(name, run) { run(); console.log('OK ' + name); passed++; }

const timingSource = source('main.js').split('let _physicsLastFrameMs = null;')[1].split('function stepPhysics()')[0];
for (const fps of [30, 60, 120, 144]) {
    test('Physics advances one second at ' + fps + ' FPS', () => {
        const world = planck.World(planck.Vec2(0, 0));
        const body = world.createDynamicBody();
        body.createFixture(planck.Circle(1), { density: 1 });
        body.setLinearVelocity(planck.Vec2(1, 0));
        const ctx = vm.createContext({ timeStep: 1 / 60, isPaused: false, ticks: 0, stepPhysics() { ctx.ticks++; world.step(1 / 60); } });
        vm.runInContext('let _physicsLastFrameMs = null;' + timingSource, ctx);
        for (let i = 0; i <= fps; i++) ctx.advancePhysics(i * 1000 / fps);
        assert.equal(ctx.ticks, 60);
        assert.ok(Math.abs(body.getPosition().x - 1) < 1e-8);
        ctx.isPaused = true;
        ctx.advancePhysics(2000);
        assert.equal(ctx.ticks, 60);
        ctx.isPaused = false;
        ctx.resetPhysicsTiming();
        ctx.advancePhysics(100000);
        assert.equal(ctx.ticks, 60);
        ctx.advancePhysics(200000);
        assert.equal(ctx.ticks, 66, 'Long gaps have bounded catch-up');
    });
}

const objectSource = source('objects.js');
const clockSource = objectSource.slice(objectSource.indexOf('let isPaused = false;'), objectSource.indexOf('let ropeIdCounter ='));
const pauseSource = objectSource.slice(objectSource.indexOf('function togglePause()'), objectSource.indexOf('function updateCursor()'));
test('Pause freezes gameplay time, including repeated pauses', () => {
    let now = 1000;
    const ctx = vm.createContext({ Date: { now: () => now }, document: { getElementById: () => ({}) }, t: x => x, resetPhysicsTiming() {}, updateInstructionText() {} });
    vm.runInContext(clockSource + pauseSource, ctx);
    ctx.togglePause();
    now = 6000;
    assert.equal(ctx.gameNowMs(), 1000);
    ctx.togglePause();
    now = 6500;
    assert.equal(ctx.gameNowMs(), 1500);
    ctx.togglePause(); now = 9000; ctx.togglePause();
    assert.equal(ctx.gameNowMs(), 1500);
});

function sceneContext() {
    const world = planck.World(planck.Vec2(0, 9.8));
    const mouseBody = world.createBody();
    const limits = { gravity: [0,25,9.8], drag: [0,0.3,0.2], wind: [-5,20,0], turbulence: [0,20,0] };
    const elements = {};
    for (const [k,[min,max,value]] of Object.entries(limits)) elements['slider-'+k] = { min, max, value };
    const messages = [];
    const ctx = vm.createContext({ planck, world, mouseBody, Date, Set, Map, Number, Math, Array,
        document: { getElementById: id => elements[id] || (elements[id] = { value: '', innerText: '', style: {} }) },
        ropeIdCounter: 0, globalClockBpm: 120, globalClockOriginMs: 0, BOUNDARY_MIN_SIZE: 1,
        gameNowMs: () => 10000, boundaryInnerRect: () => ({left:0,right:20,top:0,bottom:15}),
        applyBoundaryRect() {}, resetBoundaryToWindow() {}, resetPhysicsTiming() {},
        shiftHueColor: x => x, realignAllSyncedEmitters() {}, cancelPointerInteraction() {},
        selectedBodies: new Set(), clearScore() {}, t: key => key,
        flashMessage: text => messages.push(text), updateInstructionText() {},
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        updatePhysics() { for(let b=world.getBodyList();b;b=b.getNext()) if(!b.isStatic()) b.setLinearDamping(Number(elements['slider-drag'].value)); }
    });
    const clear = objectSource.slice(objectSource.indexOf('function clearScene('), objectSource.indexOf('let flashMessageTimeout'));
    vm.runInContext(source('storage.js') + clear + source('scenes.js'), ctx);
    return {ctx,world,mouseBody,messages,elements};
}
function bodyCount(world) { let count=0; for(let b=world.getBodyList();b;b=b.getNext()) count++; return count; }
function sampleScene(env) {
    const {world,ctx}=env;
    const a=world.createDynamicBody(planck.Vec2(2,3)); a.createFixture(planck.Circle(0.5),{density:1});
    a.soundType='note_do_5'; a.setLinearVelocity(planck.Vec2(2,-3)); a.setAngularVelocity(1.5); a.setAngularDamping(0.3); a.setLinearDamping(0.1);
    const b=world.createDynamicBody(planck.Vec2(4,3)); b.createFixture(planck.Box(0.2,0.2),{density:0.5});
    const joint=world.createJoint(planck.DistanceJoint({length:2,frequencyHz:18,dampingRatio:0.9},a,b,planck.Vec2(2,3),planck.Vec2(4,3)));
    joint.isCustomRender=true;
    return ctx.serializeScene();
}
test('Scene round-trip keeps movement, damping, notes and joints', () => {
    const env=sceneContext(); const data=sampleScene(env);
    assert.equal(data.bodies.length,2,'Internal mouse body is omitted');
    env.ctx.deserializeScene(data);
    assert.equal(bodyCount(env.world),3);
    assert.equal(env.world.getJointCount(),1);
    const restored=env.ctx.serializeScene();
    const a=restored.bodies.find(b=>b.soundType==='note_do_5');
    assert.equal(a.linearVelocity.x,2); assert.equal(a.linearVelocity.y,-3);
    assert.equal(a.angularVelocity,1.5); assert.equal(a.angularDamping,0.3); assert.equal(a.linearDamping,0.1);
    assert.equal(restored.joints[0].frequencyHz,18);
});
test('Invalid scenes leave existing bodies and joints untouched', () => {
    const env=sceneContext(); const data=sampleScene(env); const count=bodyCount(env.world);
    for(const change of [d=>d.version=99,d=>d.bodies[0].x=NaN,d=>d.bodies[0].fixtures[0].density=-1,d=>d.joints[0].bodyA=999,d=>d.boundary.right=-1,d=>d.physics.drag='oops']) {
        const broken=JSON.parse(JSON.stringify(data)); change(broken);
        assert.throws(()=>env.ctx.deserializeScene(broken));
        assert.equal(bodyCount(env.world),count); assert.equal(env.world.getJointCount(),1);
    }
});
test('Engine failure during staging rolls back newly created bodies', () => {
    const env=sceneContext(); const data=sampleScene(env); const count=bodyCount(env.world);
    const create=env.world.createDynamicBody.bind(env.world);
    env.world.createDynamicBody=(...args)=>{const b=create(...args);b.createFixture=()=>{throw Error('simulated fixture error');};return b;};
    assert.throws(()=>env.ctx.deserializeScene(data));
    assert.equal(bodyCount(env.world),count); assert.equal(env.world.getJointCount(),1);
});
test('Old snapshots without velocity fields still load', () => {
    const env=sceneContext();const data=sampleScene(env);
    for(const b of data.bodies) {delete b.linearVelocity;delete b.angularVelocity;delete b.angularDamping;}
    env.ctx.deserializeScene(data);assert.equal(bodyCount(env.world),3);
});
test('Clear scene removes bodies and joints but retains mouse anchor', () => {
    const env=sceneContext();sampleScene(env);env.ctx.clearScene();
    assert.equal(bodyCount(env.world),1);assert.equal(env.world.getJointCount(),0);assert.equal(env.world.getBodyList(),env.mouseBody);
});
test('Storage quota failure never reports successful save or delete', () => {
    const env=sceneContext();sampleScene(env);
    env.ctx.localStorage.setItem=()=>{throw Error('quota');};
    env.ctx.prompt=()=> 'Test';env.ctx.confirm=()=>true;
    env.ctx.saveScene();assert.equal(env.messages.at(-1),'scene-save-failed');
    env.ctx.localStorage.getItem=()=>JSON.stringify({Test:{version:1,bodies:[],joints:[]}});
    env.ctx.document.getElementById('scene-select').value='Test';env.ctx.deleteScene();assert.equal(env.messages.at(-1),'scene-delete-failed');
    env.ctx.autosaveNow();assert.equal(env.messages.at(-1),'autosave-failed');
    const n=env.messages.length;env.ctx.autosaveNow();assert.equal(env.messages.length,n,'Do not repeat warning every interval');
});
test('Expired objects are omitted on restore without shifting joint indices', () => {
    const env=sceneContext();const data=sampleScene(env);data.bodies[0].remainingLifespanMs=0;
    env.ctx.deserializeScene(data);assert.equal(bodyCount(env.world),2);assert.equal(env.world.getJointCount(),0);
});
test('Undo and redo preserve snapshots and history', () => {
    const env=sceneContext();sampleScene(env);env.ctx.saveUndoState();env.ctx.clearScene();
    env.ctx.undoAction();assert.equal(bodyCount(env.world),3);assert.equal(env.world.getJointCount(),1);
    env.ctx.redoAction();assert.equal(bodyCount(env.world),1);assert.equal(env.world.getJointCount(),0);
});

test('Pointer cancellation releases drag joint and editing state', () => {
    const env=sceneContext();
    const body=env.world.createDynamicBody();body.createFixture(planck.Circle(0.5),{density:1});
    env.ctx.mouseJoint=env.world.createJoint(planck.MouseJoint({maxForce:100},env.mouseBody,body,planck.Vec2(0,0)));
    env.ctx.resizingWallHandle={side:'right'};env.ctx.isDraggingWall=true;env.ctx.marqueeState={};
    env.ctx.camPanActive=true;env.ctx.boundaryDrag={};env.ctx.linkDragStart={};
    env.ctx.endSelectionDrag=()=>{env.ctx.selectionDrag=null;};env.ctx.selectionDrag={};
    const p=source('physics-world.js');
    vm.runInContext(p.slice(p.indexOf('function cancelPointerInteraction()'),p.indexOf('window.addEventListener("pointercancel"')),env.ctx);
    env.ctx.cancelPointerInteraction();
    assert.equal(env.world.getJointCount(),0);assert.equal(env.ctx.mouseJoint,null);
    assert.equal(env.ctx.resizingWallHandle,null);assert.equal(env.ctx.selectionDrag,null);
    assert.equal(env.ctx.isDraggingWall,false);assert.equal(env.ctx.marqueeState,null);
    assert.equal(env.ctx.boundaryDrag,null);assert.equal(env.ctx.linkDragStart,null);
});
test('Drawing a bar in empty space can be completely undone', () => {
    const env=sceneContext();const p=source('physics-world.js');
    env.ctx.SCALE=40;env.ctx.currentMode='bar';env.ctx.screenToWorldX=x=>x/40;env.ctx.screenToWorldY=y=>y/40;
    env.ctx.linkDragStart={startWorld:planck.Vec2(1,1),startClientX:40,startClientY:40,startBody:null,startLocal:null};
    env.ctx.LINK_DRAG_MIN_PX=8;env.ctx.linkAnchorCounter=0;
    vm.runInContext(p.slice(p.indexOf('function createLinkAnchor('),p.indexOf('function cleanupAnchorIfEmpty(')),env.ctx);
    env.ctx.handleLinkPointerUp({clientX:200,clientY:40});
    assert.equal(bodyCount(env.world),3);assert.equal(env.world.getJointCount(),1);
    env.ctx.undoAction();assert.equal(bodyCount(env.world),1);assert.equal(env.world.getJointCount(),0);
    env.ctx.redoAction();assert.equal(bodyCount(env.world),3);assert.equal(env.world.getJointCount(),1);
});
test('Timbre names are rendered as text, including HTML characters', () => {
    const main=source('main.js');const ctx=vm.createContext({getStoredCustomTimbres:()=>[{key:'custom_test',name:'<img src=x onerror=alert(1)>'}],t:x=>x});
    vm.runInContext(main.slice(main.indexOf('function escapeHTML('),main.indexOf('function buildCustomizerContent(')),ctx);
    const html=ctx._customListHTML();assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
});


test('Emitter snapshots retain pattern, remaining interval and clock phase', () => {
    const env=sceneContext();
    env.ctx.DEFAULT_PATTERN_LENGTH=16;env.ctx.blockConfigs={bass:{},note_do:{}};env.ctx.normalizeStep=s=>s;
    const b=env.world.createBody({position:planck.Vec2(5,5)});b.createFixture(planck.Box(0.5,0.5),{density:1});
    Object.assign(b,{isEmitter:true,emitterHalfW:0.5,emitterHalfH:0.5,emitterBPM:90,emitterPower:0,emitterLifetime:8,emitterNextFireMs:10250,emitterPattern:[{t:'note_do',v:2},null],emitterPatternBanks:[[{t:'note_do',v:2},null]],emitterPatternIndex:1});
    const data=env.ctx.serializeScene();env.ctx.deserializeScene(data);
    const restored=env.ctx.serializeScene().bodies.find(b=>b.isEmitter);
    assert.equal(restored.emitterNextFireDelayMs,250);assert.equal(restored.emitterPower,0);
    assert.equal(restored.emitterPattern[0].t,'note_do');assert.equal(restored.emitterPattern[0].v,2);assert.equal(restored.emitterPatternIndex,1);
    assert.equal(env.ctx.globalClockOriginMs,0);
});
test('Failed custom timbre writes leave the active library unchanged', () => {
    const audio=source('audio.js');const library={sine:{}};let stored=[];
    const ctx=vm.createContext({SOUND_TIMBRES:library,currentTimbreMode:'sine',storageGetJson:()=>stored,storageSet:()=>false,flashMessage() {},t:x=>x,Date,Math});
    vm.runInContext(audio.slice(audio.indexOf('const CUSTOM_TIMBRES_KEY'),audio.indexOf('function populateTimbreSelect()')),ctx);
    assert.equal(ctx.saveCustomTimbre('Test',{type1:'sine'}),null);assert.equal(Object.keys(library).length,1);
    library.custom_test={};stored=[{key:'custom_test',name:'Test'}];ctx.deleteCustomTimbre('custom_test');assert.ok(library.custom_test);
    stored.push({key:"custom_bad');alert(1);//",name:'invalid'});assert.equal(ctx.getStoredCustomTimbres().length,1);
});

test('Right-click in UI does not deselect the emitter; canvas still does', () => {
    let handler, deselections=0, prevented=0;
    const canvas={parentElement:{}};const body={};
    const ctx=vm.createContext({canvas,document:{body},window:{addEventListener:(name,fn)=>{handler=fn;}},deselectAllActive:()=>{deselections++;}});
    const p=source('physics-world.js');
    vm.runInContext(p.slice(p.indexOf('window.addEventListener("contextmenu"'),p.indexOf('canvas.addEventListener("pointermove"',p.indexOf('window.addEventListener("contextmenu"'))),ctx);
    handler({target:{},preventDefault:()=>{prevented++;}});
    assert.equal(deselections,0);assert.equal(prevented,0);
    handler({target:canvas,preventDefault:()=>{prevented++;}});
    assert.equal(deselections,1);assert.equal(prevented,1);
});
test('Sequencer right-click clears the pad and stops event propagation', () => {
    const o=source('objects.js');const start=o.indexOf('container.addEventListener("contextmenu", (e) => {');
    const end=o.indexOf('\n        });',start);let cleared=null,stopped=false,prevented=false;
    const ctx=vm.createContext({clearPatternStep:index=>{cleared=index;},parseInt});
    vm.runInContext('function handle(e) {'+o.slice(start+'container.addEventListener("contextmenu", (e) => {'.length,end)+'}',ctx);
    ctx.handle({target:{closest:()=>({dataset:{index:'3'}})},preventDefault:()=>{prevented=true;},stopPropagation:()=>{stopped=true;}});
    assert.equal(cleared,3);assert.equal(stopped,true);assert.equal(prevented,true);
});
test('Deselecting an emitter lets panel synchronization hide it', () => {
    const emitter={isEmitter:true};let hidden=false;
    const ctx=vm.createContext({currentEmitterPanelBody:emitter,editingWallBody:emitter,clearSelection(){},document:{querySelectorAll:()=>[]},updateCursor(){},updateInstructionText(){},closeEmitterPanel(){
        ctx.editingWallBody=null;
        if(ctx.currentEmitterPanelBody!==ctx.editingWallBody){ctx.currentEmitterPanelBody=null;hidden=true;}
    }});
    const o=source('objects.js');const start=o.indexOf('function deselectAllActive()');const end=o.indexOf('\n}',start)+2;
    vm.runInContext(o.slice(start,end),ctx);ctx.deselectAllActive();
    assert.equal(hidden,true);assert.equal(ctx.currentEmitterPanelBody,null);
});

test('Middle-button camera drag suppresses browser scrolling and follows pointer', () => {
    const handlers={};let captured=null,prevented=0;
    const ctx=vm.createContext({canvas:{addEventListener:(name,fn)=>{handlers[name]=fn;},setPointerCapture:id=>{captured=id;}},touchPointers:new Map(),pinchState:null,camPanActive:false,camPanStartX:0,camPanStartY:0,camOffsetX:12,camOffsetY:24});
    const p=source('physics-world.js');
    const start=p.indexOf('canvas.addEventListener("mousedown"');
    const end=p.indexOf('    const clientX = event.clientX;',start);
    vm.runInContext(p.slice(start,end)+'});',ctx);
    handlers.mousedown({button:1,preventDefault:()=>{prevented++;}});
    handlers.pointerdown({button:1,pointerType:'mouse',pointerId:7,clientX:100,clientY:150,preventDefault:()=>{prevented++;}});
    assert.equal(prevented,2);assert.equal(captured,7);assert.equal(ctx.camPanActive,true);
    const move=p.indexOf('canvas.addEventListener("pointermove", (event) => {',end);
    vm.runInContext(p.slice(move,p.indexOf('    const mousePos =',move))+'});',ctx);
    handlers.pointermove({pointerType:'mouse',clientX:160,clientY:130});
    assert.equal(ctx.camOffsetX,72);assert.equal(ctx.camOffsetY,4);
    handlers.pointermove({pointerType:'mouse',clientX:180,clientY:170});
    assert.equal(ctx.camOffsetX,92);assert.equal(ctx.camOffsetY,44);
    handlers.mousedown({button:0,preventDefault:()=>{throw new Error('Left click must retain its behavior');}});
});

test('Audio burst keeps live voices bounded, including fade tails and layered instruments', () => {
    const sources=[];const params=[];
    const param=()=>{const p={value:0,holds:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},cancelAndHoldAtTime(){this.holds++;}};params.push(p);return p;};
    const node=()=>({connect(){},disconnect(){this.disconnected=true;},gain:param(),frequency:param(),Q:param()});
    const sourceNode=()=>{const n=node();n.listeners=[];n.addEventListener=(name,fn)=>n.listeners.push(fn);n.start=()=>{};n.stop=()=>{n.stops=(n.stops||0)+1;};n.end=()=>{for(const fn of n.listeners.splice(0))fn();};sources.push(n);return n;};
    const audioCtx={currentTime:1,sampleRate:100,createOscillator:sourceNode,createBufferSource:sourceNode,createGain:node,createBiquadFilter:node,createBuffer:(channels,len)=>({getChannelData:()=>new Float32Array(len)})};
    const ctx=vm.createContext({audioCtx,getScheduledTime:x=>x,getCurrentTimbre:()=>({type1:'sine',type2:'sine',sub:true,cutoffMult:2,resonance:1}),connectToEffectsBus(){},masterVolume:1,currentTimbreMode:'pad',isInstrumentType:()=>false,nextNoteFrequency:()=>220,volumes:{},getTimbreDuration:()=>1,getTimbreAttack:()=>0.01,addScore(){},addHarmonyScore(){},Math});
    const a=source('audio.js');
    vm.runInContext(a.slice(a.indexOf('let activeSoundsCount = 0;'),a.indexOf('const INST_TYPES')),ctx);
    const play=[()=>ctx.playKick(1),()=>ctx.playSnare(1),()=>ctx.playHiHat(true,1),()=>ctx.playClap(1),()=>ctx.playConga(1,false),()=>ctx.playClave(1),()=>ctx.playHarpsichordNote(220,1),()=>ctx.playMixedSound('bass','melody',8,0)];
    for(let i=0;i<10000;i++)play[i%play.length]();
    assert.equal(vm.runInContext('activeVoices.length',ctx),40);
    assert.equal(vm.runInContext('activeSoundsCount',ctx),40);
    assert.ok(sources.length<=40*8,'No extra sources allocated during overloaded burst');
    assert.equal(vm.runInContext('activeVoices.filter(v=>v.retiring).length',ctx),1);
    assert.ok(params.some(p=>p.holds>0),'Fade holds the current envelope');
    sources.forEach(n=>n.end());
    assert.equal(vm.runInContext('activeVoices.length',ctx),0);
    assert.equal(vm.runInContext('activeSoundsCount',ctx),0);
    assert.ok(sources.every(n=>n.disconnected));
    ctx.playSnare(1);const layered=sources.slice(-2);
    layered[0].end();assert.equal(vm.runInContext('activeVoices.length',ctx),1);
    layered[1].end();assert.equal(vm.runInContext('activeVoices.length',ctx),0);
    ctx.playHarpsichordNote(220,1);assert.equal(vm.runInContext('activeSoundsCount',ctx),1);
    sources.slice(-8).forEach(n=>n.end());assert.equal(vm.runInContext('activeSoundsCount',ctx),0);
});

test('Pattern painting groups a drag into one undo entry and supports redo', () => {
    const env=sceneContext();const {ctx,world}=env;
    ctx.DEFAULT_PATTERN_LENGTH=16;ctx.blockConfigs={bass:{},note_do:{}};ctx.normalizeStep=s=>s;ctx.stepType=s=>s?.t||null;ctx.stepVelocity=s=>s?.v??1;
    const o=source('objects.js');
    vm.runInContext(o.slice(o.indexOf('function ensurePatternArray('),o.indexOf('function renderEmitterBankBar(')),ctx);
    vm.runInContext(o.slice(o.indexOf('let _patternDragUndoSaved'),o.indexOf('let _patternPlayheadTimer')),ctx);
    ctx.renderEmitterPattern=()=>{};
    const b=world.createBody({position:planck.Vec2(5,5)});b.createFixture(planck.Box(0.5,0.5),{density:1});
    Object.assign(b,{isEmitter:true,emitterHalfW:0.5,emitterHalfH:0.5,emitterNextFireMs:11000,emitterPattern:[null,null,null]});ctx.currentEmitterPanelBody=b;ctx.ensurePatternBanks(b);
    env.elements['emitter-pattern-add-select']={value:'note_do'};
    ctx.paintPatternStep(0,true,true);ctx.paintPatternStep(1,true,true);ctx.paintPatternStep(2,true,true);
    assert.equal(vm.runInContext('undoStack.length',ctx),1);
    ctx.undoAction();let restored=ctx.serializeScene().bodies.find(b=>b.isEmitter);
    assert.ok(restored.emitterPattern.every(s=>s===null));
    ctx.redoAction();restored=ctx.serializeScene().bodies.find(b=>b.isEmitter);
    assert.equal(restored.emitterPattern.filter(Boolean).length,3);
});
test('Autosave captures session on page hide and backgrounding', () => {
    const handlers={};let saved=0;
    const ctx=vm.createContext({window:{addEventListener:(name,fn)=>{handlers[name]=fn;}},document:{visibilityState:'visible',addEventListener:(name,fn)=>{handlers[name]=fn;}},setInterval(){},autosaveNow:()=>{saved++;}});
    const s=source('scenes.js');vm.runInContext(s.slice(s.indexOf('function autosaveStartInterval()'),s.indexOf('function restoreLastSessionIfAny()')),ctx);
    ctx.autosaveStartInterval();handlers.visibilitychange();assert.equal(saved,0);
    ctx.document.visibilityState='hidden';handlers.visibilitychange();handlers.pagehide();assert.equal(saved,2);
});

test('Stop sounds pauses new events and clears reverb and delay tails', () => {
    const make=()=>({disconnect(){this.disconnected=true;},connect(){},buffer:{},delayTime:{value:0.28}});
    const oldReverb=make(),oldDelay=make(),feedback=make();let stopped=0,faded=0;
    const ctx=vm.createContext({isPaused:false,togglePause(){ctx.isPaused=true;},audioCtx:{currentTime:2,createConvolver:make,createDelay:make},activeVoices:[{gains:[{gain:{cancelAndHoldAtTime(){},linearRampToValueAtTime(){faded++;}}}],oscillators:[{stop(){stopped++;}}]}],STEAL_FADE_SEC:0.02,reverbConvolver:oldReverb,delayNode:oldDelay,delayFeedback:feedback,reverbWetGain:{},delayWetGain:{}});
    const a=source('audio.js');vm.runInContext(a.slice(a.indexOf('function stopAllSounds()')),ctx);
    ctx.stopAllSounds();assert.equal(ctx.isPaused,true);assert.equal(stopped,1);assert.equal(faded,1);
    assert.equal(oldReverb.disconnected,true);assert.equal(oldDelay.disconnected,true);assert.equal(feedback.disconnected,true);
    assert.notEqual(ctx.reverbConvolver,oldReverb);assert.notEqual(ctx.delayNode,oldDelay);
    assert.equal(ctx.delayNode.delayTime.value,0.28);assert.equal(ctx.reverbConvolver.buffer,oldReverb.buffer);
});
test('New presets have valid lengths and velocity values', () => {
    const ctx=vm.createContext({getEmitterSpawnableTypes:()=>['note_do'],Math});const o=source('objects.js');
    vm.runInContext(o.slice(o.indexOf('const PATTERN_PRESETS ='),o.indexOf('function applyPatternPreset(')),ctx);
    for(const name of ['ambient-16','syncopated-16','arpeggio-16']){
        const pattern=vm.runInContext('PATTERN_PRESETS['+JSON.stringify(name)+']()',ctx);
        assert.equal(pattern.length,16);assert.ok(pattern.some(Boolean));
        assert.ok(pattern.every(s=>!s||Number.isInteger(s.v)&&s.v>=0&&s.v<=2));
    }
});

console.log(passed + ' regression checks passed.');
