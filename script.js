import { Vec3, Mat3 } from './linear-algebra.js';

const canvas = document.querySelector('canvas');
const animateButton = document.querySelector('[value="Animate"]');
const stopButton = document.querySelector('[value="Stop"]');
const camLat = document.querySelector('#cam_lat');
const camLon = document.querySelector('#cam_lon');
const isInertial = document.querySelector('#is_inertial');
const showPaths = document.querySelector('#paths');
const timeInput = document.querySelector('#time');

const canvasSize = 390;
const radiusRatio = 0.8;
const ctx = canvas.getContext('2d');

const HOUR = 3600;
const DAY = 24*HOUR;
const TRAVEL_TIME = 7.5*HOUR;
const ROT_SPEED = 360/DAY;
const TO_RAD = Math.PI/180;

const camTransform = Mat3();
const finalTransform = Mat3();

canvas.width = canvasSize;
canvas.height = canvasSize;

timeInput.setAttribute('max', TRAVEL_TIME);

const clear2DTransform = () => ctx.setTransform(1, 0, 0, 1, 0, 0);
const set2DTransform = () => ctx.setTransform(
	radiusRatio*canvasSize/2, 0,
	0, - radiusRatio*canvasSize/2,
	canvasSize*0.5, canvasSize/2,
);

const drawEarth = () => {
	ctx.fillStyle = '#aaa';
	ctx.strokeStyle = '#fff';
	ctx.lineWidth = 10/canvasSize;
	ctx.beginPath();
	ctx.arc(0, 0, 1, 0, Math.PI*2);
	ctx.stroke();
	ctx.fill();
};

const points = [];
const createPoint = (lat, lon, color = '#000') => {
	const point = {
		color,
		pos: Vec3(0, 0, 1).rotateX(-lat*TO_RAD).rotateY(lon*TO_RAD),
		fixed: false,
		path: false,
	};
	return point;
};
const clonePoint = ({ color, pos, path, fixed }) => ({ color, pos: pos.clone(), path, fixed });
const addPoint = (lat, lon, color = '#000') => {
	const point = createPoint(lat, lon, color);
	points.push(point);
	return point;
};

const createPointInBetween = (a, b) => {
	const pos = a.pos.add(b.pos, Vec3()).normalize();
	const point = { color: a.color, pos };
	return point;
};

const renderPoint = (point) => {
	const { color, pos, fixed, path } = point;
	if (path && !showPaths.checked) return;
	const mat = fixed ? camTransform : finalTransform;
	const [ x, y, z ] = pos.apply(mat, Vec3());
	if (z < 0) return;
	const rad = 5/canvasSize;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, rad, 0, Math.PI*2);
	ctx.fill();
};

const render = () => {
	clear2DTransform();
	ctx.clearRect(0, 0, canvasSize, canvasSize);
	set2DTransform();
	drawEarth();
	points.forEach(renderPoint);
};

const getEarthRotation = () => getTime()*ROT_SPEED;
const getCameraRotation = () => camLon.value*1;

const updateTransform = () => {
	camTransform.clear()
		.rotateY(-getCameraRotation()*TO_RAD)
		.rotateX(camLat.value*TO_RAD);

	finalTransform.clear()
		.rotateY(getEarthRotation()*TO_RAD)
		.apply(camTransform);

	render();
};

const compilePath = (points) => {
	const pairs = [];
	let total = 0;
	for (let i=1; i<points.length; ++i) {
		const a = points[i - 1];
		const b = points[i];
		const begin = total;
		const distance = a.pos.sub(b.pos, Vec3()).len();
		total += distance;
		const end = total;
		pairs.push({ a, b, distance, begin, end });
	}
	return { points, pairs, total };
};

const createPath = (a, b, subdivisions) => {
	a = clonePoint(a);
	b = clonePoint(b);
	const points = [];
	const addMiddle = (a, b, subdivisions) => {
		if (subdivisions <= 0) return;
		const m = createPointInBetween(a, b);
		addMiddle(a, m, subdivisions - 1);
		points.push(m);
		addMiddle(m, b, subdivisions - 1);
	};
	points.push(a);
	addMiddle(a, b, subdivisions);
	points.push(b);
	return compilePath(points);
};

const progressAlongPath = (path, val, point) => {
	const { pairs, total } = path;
	const traveled = val*total;
	for (let pair of pairs) {
		const { a, b, distance, begin, end } = pair;
		if (traveled < begin || traveled > end) continue;
		const p = (traveled - begin)/distance;
		a.pos.mix(b.pos, p, point.pos);
		return;
	}
};

const stringifyTime = (seconds) => {
	let total = Math.round(seconds);
	let s = total % 60;
	total = Math.round((total - s)/60);
	let m = total % 60;
	total = Math.round((total - m)/60);
	let h = total;
	return `${
		(h + '').padStart(2, '0')
	}:${
		(m + '').padStart(2, '0')
	}:${
		(s + '').padStart(2, '0')
	}`;
};

const rotatePoint = (point, rotation) => point.pos.rotateY(rotation*TO_RAD);

const convertToInertial = (path, TRAVEL_TIME) => {
	const nPoints = path.points.length;
	const dt = TRAVEL_TIME/(nPoints - 1);
	for (let i=0; i<nPoints; ++i) {
		const point = path.points[i];
		const t = dt*i;
		const rotation = t*ROT_SPEED;
		rotatePoint(point, -rotation);
	}
	return path;
};

const createInertialPath = (a, b, TRAVEL_TIME, subdivisions) => {
	a = clonePoint(a);
	b = clonePoint(b);
	let rotation = ROT_SPEED*TRAVEL_TIME;
	rotatePoint(b, rotation);
	const path = createPath(a, b, subdivisions);
	return convertToInertial(
		createPath(a, b, subdivisions),
		TRAVEL_TIME,
	);
};

const createFixedInertialPath = (a, b, TRAVEL_TIME, subdivisions) => {
	a = clonePoint(a);
	b = clonePoint(b);
	let rotation = ROT_SPEED*TRAVEL_TIME;
	rotatePoint(b, rotation);
	const path = createPath(a, b, subdivisions);
	path.points.forEach(point => {
		point.fixed = true;
		point.path = true;
		point.color = 'rgba(255, 255, 255, 0.5)';
		points.push(point);
	});
	return path;
};

for (let lat=80; lat>=-80; lat-=10) {
	for (let lon=180; lon>=-170; lon-=10) {
		addPoint(lat, lon, 'rgba(0, 0, 0, 0.1)');
	}
}

const coord_a = [ 0, 0 ];
const coord_b = [ 60, 0 ];

const aPoint = addPoint(...coord_a, '#fff');
const bPoint = addPoint(...coord_b, '#fff');

const groundPath = createPath(aPoint, bPoint, 6);
const inertialPath = createInertialPath(aPoint, bPoint, TRAVEL_TIME, 6);
groundPath.points.forEach(point => {
	point.path = true;
	point.color = 'rgba(255, 255, 255, 0.5)';
	points.push(point);
});
inertialPath.points.forEach(point => {
	point.path = true;
	point.color = 'rgba(255, 255, 255, 0.5)';
	points.push(point);
});
createFixedInertialPath(aPoint, bPoint, TRAVEL_TIME, 6);

const target1 = addPoint(0, 0, '#f20');
const target2 = addPoint(0, 0, '#07f');

const getTime = () => timeInput.value*1;

const updateFrame = () => {
	const time = getTime();
	updateTransform();
	const val = time/TRAVEL_TIME;
	progressAlongPath(groundPath, val, target1);
	progressAlongPath(inertialPath, val, target2);
	render();
	clear2DTransform();
	ctx.font = '12px monospace';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'bottom';
	ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
	ctx.fillText('Time elapsed: ' + stringifyTime(time), 10, canvasSize - 10);
};

createInertialPath(aPoint, bPoint, TRAVEL_TIME, 3);

camLon.oninput = updateFrame;
camLat.oninput = updateFrame;
showPaths.oninput = updateFrame;

let lastTime = getTime();
const handleTimeChange = () => {
	const current = getTime();
	const change = current - lastTime;
	lastTime = current;
	const rotInc = change*ROT_SPEED;
	if (!isInertial.checked) {
		camLon.value = (camLon.value*1 + rotInc + 360)%360;
	}
	updateFrame();
};

const animation = {
	t0: null,
	interval: null,
	duration: 3000,
};
const animationLoop = () => {
	const { t0, duration } = animation;
	let t = Math.min(1, (Date.now() - t0)/duration);
	if (t === 1) stopAnimation();
	t = (1 - Math.cos(t*Math.PI))/2;
	timeInput.value = t*timeInput.getAttribute('max');
	handleTimeChange();
	updateFrame();
};
const stopAnimation = () => {
	clearInterval(animation.interval);
};
const animate = () => {
	stopAnimation();
	animation.t0 = Date.now();
	animation.interval = setInterval(animationLoop, 0);
};

updateFrame();

animateButton.onclick = animate;
stopButton.onclick = stopAnimation;
timeInput.oninput = () => handleTimeChange();
