const mulMatMat = (a, b, r) => {
	const [ aix, aiy, aiz, ajx, ajy, ajz, akx, aky, akz ] = a;
	const [ bix, biy, biz, bjx, bjy, bjz, bkx, bky, bkz ] = b;
	r[0] = aix*bix + aiy*bjx + aiz*bkx;
	r[1] = aix*biy + aiy*bjy + aiz*bky;
	r[2] = aix*biz + aiy*bjz + aiz*bkz;
	r[3] = ajx*bix + ajy*bjx + ajz*bkx;
	r[4] = ajx*biy + ajy*bjy + ajz*bky;
	r[5] = ajx*biz + ajy*bjz + ajz*bkz;
	r[6] = akx*bix + aky*bjx + akz*bkx;
	r[7] = akx*biy + aky*bjy + akz*bky;
	r[8] = akx*biz + aky*bjz + akz*bkz;
	return r;
};

const mulVecMat = (v, m, r) => {
	const [ vx, vy, vz ] = v;
	const [ mix, miy, miz, mjx, mjy, mjz, mkx, mky, mkz ] = m;
	r[0] = vx*mix + vy*mjx + vz*mkx;
	r[1] = vx*miy + vy*mjy + vz*mky;
	r[2] = vx*miz + vy*mjz + vz*mkz;
	return r;
};

const rotationXMat = (angle, r) => {
	const sin = Math.sin(angle);
	const cos = Math.cos(angle);
	r[0] = 1;
	r[1] = 0;
	r[2] = 0;
	r[3] = 0;
	r[4] = cos;
	r[5] = sin;
	r[6] = 0;
	r[7] = -sin;
	r[8] = cos;
	return r;
};

const rotationYMat = (angle, r) => {
	const sin = Math.sin(angle);
	const cos = Math.cos(angle);
	r[0] = cos;
	r[1] = 0;
	r[2] = -sin;
	r[3] = 0;
	r[4] = 1;
	r[5] = 0;
	r[6] = sin;
	r[7] = 0;
	r[8] = cos;
	return r;
};

class Vector3 extends Array {
	constructor(x = 0, y = 0, z = 0) {
		super(x, y, z);
	}
	clone() {
		const [ x, y, z ] = this;
		return new Vector3(x, y, z);
	}
	apply(mat, r = this) {
		mulVecMat(this, mat, r);
		return r;
	}
	sub(vec, r = this) {
		const [ ax, ay, az ] = this;
		const [ bx, by, bz ] = vec;
		r[0] = ax - bx;
		r[1] = ay - by;
		r[2] = az - bz;
		return r;
	}
	add(vec, r = this) {
		const [ ax, ay, az ] = this;
		const [ bx, by, bz ] = vec;
		r[0] = ax + bx;
		r[1] = ay + by;
		r[2] = az + bz;
		return r;
	}
	mix(vec, val, r = this) {
		val = Math.max(0, Math.min(1, val));
		const inv = 1 - val;
		const [ ax, ay, az ] = this;
		const [ bx, by, bz ] = vec;
		r[0] = ax*inv + bx*val;
		r[1] = ay*inv + by*val;
		r[2] = az*inv + bz*val;
		return r;
	}
	len() {
		const [ x, y, z ] = this;
		return Math.sqrt(x*x + y*y + z*z);
	}
	scale(factor, r = this) {
		const [ x, y, z ] = this;
		r[0] = x*factor;
		r[1] = y*factor;
		r[2] = z*factor;
		return r;
	}
	normalize(r = this) {
		const [ x, y, z ] = this;
		const length = Math.sqrt(x*x + y*y + z*z);
		const factor = 1/length;
		r[0] = x*factor;
		r[1] = y*factor;
		r[2] = z*factor;
		return r;
	}
	rotateX(angle, r = this) {
		rotationXMat(angle, auxMat);
		this.apply(auxMat, r);
		return r;
	}
	rotateY(angle, r = this) {
		rotationYMat(angle, auxMat);
		this.apply(auxMat, r);
		return r;
	}
}

class Matrix3 extends Array {
	constructor() {
		super(
			1, 0, 0,
			0, 1, 0,
			0, 0, 1,
		);
	}
	apply(mat, r = this) {
		mulMatMat(this, mat, r);
		return r;
	}
	rotateX(angle, r = this) {
		rotationXMat(angle, auxMat);
		this.apply(auxMat, r);
		return r;
	}
	rotateY(angle, r = this) {
		rotationYMat(angle, auxMat);
		this.apply(auxMat, r);
		return r;
	}
	clear() {
		this[0] = 1;
		this[1] = 0;
		this[2] = 0;
		this[3] = 0;
		this[4] = 1;
		this[5] = 0;
		this[6] = 0;
		this[7] = 0;
		this[8] = 1;
		return this;
	}
}

const auxMat = new Matrix3();

export const Mat3 = () => new Matrix3();
export const Vec3 = (...args) => new Vector3(...args);
