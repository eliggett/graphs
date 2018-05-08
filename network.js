// 2017 by Shanti Rao
// Spring Layout algorithm adapted from Dracula at GraphDracula.net

function Graph(nodeStyle, edgeStyle)
{
	// insert text parser here∂
	this.nodes = [];
	this.edges = []; // {source, target, style}
	this.range = null;
	this.nextId = 1;
	this.nodeStyle = nodeStyle || {borderRadius :'8px', border:'1px solid black'};
	this.edgeStyle = edgeStyle || {stroke:'black'};
}

Graph.isIE = !(window.ActiveXObject) && "ActiveXObject" in window;

Graph.svgNamespace = "http://www.w3.org/2000/svg";

Graph.svgtag = function(parent,tag,properties)
{
	var t = document.createElementNS(Graph.svgNamespace, tag);
	if (properties) for (var i in properties) t.setAttribute(i,properties[i]);
	if (parent) parent.appendChild(t);
	return t;
}

Graph.Node = function(label, style, hasOwnStyle)
{
	this.label = label;
	this.style = style;
	this.hasOwnStyle = hasOwnStyle || false;
	this.moveX = true;
	this.moveY = true;
	this.shape = null; //SVG interface
	this.fill = null; //color override
	this.edges = [];
	this.rank = 0;
	this.pos = [0,0];
	this.force = [0,0];
	this.padding=4;

	this.makeHTMLLabel(this.label);
	//this.makeTextLabel() is faster
}

Graph.Edge = function(source,target,label,style,weight)
{
	this.source = source;
	this.target = target;
	this.label = label;
	this.style = style;
	this.stroke = null; //color override
	this.weight = weight || 1;
	this.arrows = null; // [false,true]
	this.obj = null; //how to draw the label
	this.shape = null; //SVG interface
	this.direction =  -1; //any port 0 = right, 1 = down, 2 = left, 3 = up
	this.points = null;
}

Graph.prototype.forEdges = function(nodes,callback)
{
	for (var i = 0; i< this.edges.length; i++)
		if (nodes.indexOf(this.edges[i].source) != -1 || nodes.indexOf(this.edges[i].target) != -1)
			callback(this.edges[i]);
}
Graph.prototype.forSource = function(source,callback)
{
	for (var i = 0; i< this.edges.length; i++)
		if (this.edges[i].source === source)
			callback(this.edges[i].target);
}
Graph.prototype.forTarget = function(target,callback)
{
	for (var i = 0; i< this.edges.length; i++)
		if (this.edges[i].target === target)
			callback(this.edges[i].source);
}
Graph.Node.prototype.connections = function()
{
	var w = this.width/2+this.padding;
	var h = this.height/2+this.padding;
	//left, top, right, bottom
	return [[this.x-w,this.y],[this.x,this.y-h],[this.x+w,this.y],[this.x,this.y+h]];
}
Graph.Node.prototype.color = function(c)
{
	this.fill = c;
	if (this.shape) this.shape.style.fill = c || this.style.fill || '';
	return this;
}
Graph.Edge.prototype.color = function(c)
{
	this.stroke = c;
	if (this.shape) this.shape.style.stroke = c || this.style.stroke || '';
	return this;
}
Graph.Node.prototype.setAttribute = function(n,v)
{
	if (!this.hasOwnStyle)
	{
		this.style = copyObject(this.style); 
		this.hasOwnStyle = true;
	}
	this.style[n]=v;
	return this;
}
Graph.Node.prototype.distance = function(node)
{
	if (node) return vdist2(this.pos,node.pos);
	var x=0;
	for (var i=0;i<this.edges.length;i++) x+= this.edges[i].length();
	return x;
}
Graph.Edge.prototype.length = function(node)
{
	return vdist2(this.source.pos,this.target.pos);
}

function vsub2(a,b)
{
	return [a[0]-b[0],a[1]-b[1]];
}
function vadd2(a,b)
{
	return [a[0]+b[0],a[1]+b[1]];
}
function vlen2(a)
{
	return a[0]*a[0]+a[1]*a[1];
}
function vdist2(a,b)
{
	var x = a[0]-b[0]; var y = a[1]-b[1];
	return x*x + y*y;
}
function vscale2(a,s)
{
	return [a[0]*s,a[1]*s];
}

Graph.Edge.prototype

Graph.Edge.prototype.connect = function()
{// find the minimum edge
	var p1 = this.source.connections();
	var p2 = this.target.connections();
	var d = [];
	var m = 0;
	var dm = 0;
	var s = [this.source.x, this.source.y];
	var t = [this.target.x, this.target.y];

	if (this.direction == 0) // right
		return [p1[2],p2[0],vsub2(p1[2],s),vsub2(p2[0],t)];
	else if (this.direction == 1) // down
		return [p1[3],p2[1],vsub2(p1[3],s),vsub2(p2[1],t)];

	for (var i=0;i<p1.length; i++)
	for (var j=0;j<p2.length; j++)
		d.push([vdist2(p1[i],p2[j]),p1[i],p2[j]]);

	var m = 0;
	var dm = d[0][0];
	for (var i=1;i<d.length;i++)
		if (d[i][0] < dm) {m = i;dm=d[i][0];}
	return [d[m][1],d[m][2],vsub2(d[m][1],s),vsub2(d[m][2],t)];
}

// {shape: (output), label: '' , style: ''}
Graph.prototype.node = function(label, style)
{
	var l = label|| (this.nextId++).toString();
	var s = style || this.nodeStyle;
	var node = new Graph.Node(l,s);
	node.hasOwnStyle = (s !== this.nodeStyle);
	this.nodes.push(node);
	return node;
}

Graph.prototype.edge = function(source,target,label,style)
{
	var l = label || null;
	var s = style || this.edgeStyle;
	var edge = new Graph.Edge(source,target,l,s,1);
	//source.targets.push(target);
	this.edges.push(edge);
	return edge;
}

Graph.prototype.bounds = function()
{
	var minX = Infinity;
	var minY = Infinity;
	var maxX = -Infinity;
	var maxY = -Infinity;
	var left = 0; var top = 0; var right = 0; var bottom = 0;

	for (var i=0; i<this.nodes.length; i++)
	{
		var n = this.nodes[i];
		if (n.pos[0] > maxX) {maxX = n.pos[0]; right = n.width/2;}
		if (n.pos[1] > maxY) {maxY = n.pos[1]; bottom = n.height/2;}
		if (n.pos[0] < minX) {minX = n.pos[0]; left = n.width/2;}
		if (n.pos[1] < minY) {minY = n.pos[1]; top = n.height/2;}
	}
	return {minX:minX,minY:minY,maxX:maxX,maxY:maxY,
			rangeX:maxX-minX,rangeY:maxY-minY,
			left:left, top:top, right:right, bottom:bottom};
}

Graph.Node.prototype.resize = function()
{
	var cr = this.obj.getClientRects();

	this.width = this.obj.offsetWidth ||  this.obj.scrollWidth;
	this.height = this.obj.offsetHeight || this.obj.scrollHeight;
	if (this.shape)
	{
		this.shape.width = this.width;
		this.shape.height = this.height;
	}
}

//sometimes makeHTMLLabel is too slow
Graph.Node.prototype.makeTextLabel = function(label,padding)
{
	this.label = label || this.label;
	this.width = 7*label.length;
	this.height = 15;
}

Graph.Node.prototype.makeHTMLLabel = function(label,padding)
{
	div = document.createElement('span');
	padding = padding || 6;
	div.style.display='inline-block';
	div.style.padding=padding+'px';
	for (var s in this.style)
	{
		try{div.style[s] = this.style[s];}
		catch(e) {}
	}
	
	div.innerHTML = label;
	if (typeof div.firstChild !== 'undefined' && 'style' in div.firstChild)
		div.firstChild.style.display='inline-block';
	document.body.appendChild(div);
	//var cs = div.getBoundingClientRect();

	this.obj = div;
	this.width= div.scrollWidth; //cs.width;
	this.height = div.scrollHeight;//cs.height;
	//document.body.removeChild(div);

	// body...
	return div;
}

Graph.html2svg = function(svg,n)
{
	var s = Graph.svgtag(svg,'foreignObject');
	if (n.parentElement) n.parentElement.removeChild(n);
	s.appendChild(n);
	return s;
}

Graph.Node.prototype.draw = function(svg,fast)
{
	if (!this.shape)
	{
		if (fast) 
			this.shape = Graph.text2svg(svg,this.label,this.style);
		else if (Graph.isIE && this.obj)
			this.shape = Graph.html2svg2(svg,this.obj);
		else if (this.obj)
			this.shape = Graph.html2svg(svg,this.obj);
		else
			this.shape = Graph.text2svg(svg,this.label,this.style);
	}
	if ('onclick' in this)
		this.shape.setAttribute('onclick',this.onclick);
	if (false) for (var s in this.style) //adds extra borders
	{
		try{this.shape.style[s] = this.style[s];}
		catch(e) {}
	}

	if (this.fill) this.shape.style.fill=this.fill;

	this.padding = 1+1*parseInt(this.style['border-width'] || this.style['border']) || 1;
	var m = this.padding;
	var x = this.x-this.width/2-m+1;
	var y = this.y-this.height/2-m+1;

	if (Graph.isIE)
		this.shape.setAttribute('transform','translate('+x+' '+y+')');
	else
	{
		this.shape.setAttribute("x",x);
		this.shape.setAttribute("y",y);
		this.shape.setAttribute("width",this.width+2*m);
		this.shape.setAttribute("height",this.height+2*m);
	}
}

// start, end, a direction, b direction
function curveto(a,b,da,db)
{
	const x1 = a[0];
	const y1 = a[1];
	const x4 = b[0];
	const y4 = b[1];
	var dx = Math.max(Math.abs(x1 - x4) / 2, 10);
	var dy = Math.max(Math.abs(y1 - y4) / 2, 10);
	var scale = 3*Math.sqrt(vdist2(a,b)/Math.sqrt(0.01+vlen2(a)*vlen2(b)));
	var v = vadd2(a,vscale2(da,scale));
	var x2 = v[0]; var y2=v[1];
	var v = vadd2(b,vscale2(db,scale));
	var x3 = v[0]; var y3=v[1];

	return 'M'+x1+' '+y1+' C'+x2+' '+y2+', '+x3+' '+y3+' '+x4+' '+y4;
}

Graph.Edge.prototype.draw = function(svg)
{
    if (!this.shape)
    {
    	this.shape = Graph.svgtag(svg,'path');
		this.shape.style.fill = 'transparent';
    }

    var v = this.connect();
    var a = v[0]; // IE can't do destructuring assignment
    var b = v[1];
    var da = v[2];
    var db = v[3];
    this.points = [a,b];

	this.shape.setAttribute("d",curveto(a,b,da,db));
	for (var s in this.style)
		this.shape.style[s] = this.style[s];

	if (this.stroke) this.shape.style.stroke=this.stroke;
	
	if (this.directed)
		this.shape.setAttribute('marker-end','url(#arrow)');

	if (this.arrows)
	{
		if (this.arrows[0]) this.shape.setAttribute('marker-start','url(#arrow)');
		if (this.arrows[1]) this.shape.setAttribute('marker-end','url(#arrow)');
	}
}

Graph.prototype.rank2 = function(direction)
{
	this.direction = direction = direction !== undefined ? direction : 1;
	var scale = 1;
	var rankCount = [];
	var maxRank = 0;
	var self = this;
	var i,j,k,n,iter,a,b,x1,x2;
	var nodes = this.nodes; var edges = this.edges;
	for (i=0;i<this.nodes.length;i++)this.nodes[i].rank=-1;
	function rankRecurse(n,r)
	{
		if (n.marked) return;
		if (r > n.rank) n.rank = r;
		n.marked = true;
		self.forSource(n,function(x){rankRecurse(x,n.rank+1)});
	}
	for (i=0; i<nodes.length; i++)
	{
		for (j=0;j<nodes.length;j++) nodes[j].marked=false;
		n = nodes[i];
		if (n.rank == -1) rankRecurse(n,0);
		maxRank = Math.max(maxRank,n.rank);
	}
	for (i=0; i<nodes.length; i++)
	{
		rankCount[nodes[i].rank] = (rankCount[nodes[i].rank]||0) + 1;
	}
	for (i=0; i<edges.length; i++)
	{		
		e = edges[i];
		if (e.source.rank < e.target.rank) e.direction = direction;
	}
	var rankList  = new Array(rankCount.length);
	for (i=0; i< rankCount.length; i++)
	{
		rankList[i] = nodes.filter(function(n){return n.rank == i});
		maxRank = Math.max(maxRank,rankList[i].length);
	}

	for (i=0; i<rankList.length; i++)
		for (j=0; j<rankList[i].length; j++)
		{
			k = (j+0.5)*maxRank/rankList[i].length; //uniform distribution
			rankList[i][j].pos = vscale2(direction?[k,i]:[i,k],scale);
		}

	for (i=0; i<nodes.length; i++)
	{
		if (direction) {nodes[i].moveY = false;}
		else {nodes[i].moveX = false;}
	}

	function swap(a,b) {var c = b.pos; b.pos = a.pos; a.pos = c;}

	for (iter=0; iter<2; iter++)
	{
		this.spring2(10);
		for (i=0;i<rankList.length;i++)
		{
			n = rankList[i];
			for (j=1;j<n.length;j++)
				for (k=0;k<j;k++)
				{
					a = n[j];
					b = n[k];
					x1 = a.distance();
					x2 = b.distance();
					swap(a,b);
					if (x1 < a.distance() || x2 < b.distance()) swap(a,b);
				}
		}

	}

	return this.spring2(20);
}

Graph.prototype.rankLayout = function(direction)
{ //direction = 0 for left->right
	direction = arguments.length<1 ? 1 : direction;
	var spacing = direction ? 2:2;
	this.nodes.forEach(function(n){n.rank=-1});
	var rankCount ;
	var rankSize ;
	var self = this;
	var rank = 0;
	var n,r,e;
	function reset(n){n.marked=false;};
	function rankRecurse(n,r)
	{
		if (n.marked) return;
		if (r > n.rank) n.rank = r;
		n.marked = true;
		rank = Math.max(rank,n.rank);
		self.forSource(n,function(x){rankRecurse(x,n.rank+1)});
//		n.targets.forEach(function(x){rankRecurse(x,n.rank+1)})
	}
	for (var i=0; i<this.nodes.length; i++)
	{
		n = this.nodes[i];
		this.nodes.forEach(reset);
		if (n.rank == -1) rankRecurse(n,0);
	}
	rankCount = zeros(rank);
	rankSize = zeros(rank);
	for (var i=0; i<this.nodes.length; i++)
	{
		n = this.nodes[i];
		r = n.rank;
		rankCount[r]++;
		rankSize[r] = Math.max(rankSize[r],direction?n.width:n.height);
	}
	for (var i=0; i<this.edges.length; i++)
	{
		e = this.edges[i];
		if (e.source.rank < e.target.rank) e.direction = direction;
	}
	r=0;
	for (var i=0; i<rank; i++)
	{
		rankSize[i] += r;
		r = rankSize[i];
	}
	
	for (var i=0; i<this.nodes.length; i++)
	{
		n = this.nodes[i];
		if (direction) {n.pos[1] = rankSize[n.rank]; n.moveY = false;} //n.rank*spacing
		else {n.pos[0] = rankSize[n.rank]; n.moveX = false;} //n.rank*spacing
	}

	return this.springLayout();
	//fix spacing?

	//try swapping positions within ranks.
}

Graph.prototype.constrain = function(moveX,moveY)
{
	for (var i=0; i<this.nodes.length; i++)
	{
		var n = this.nodes[i];
		n.moveX = moveX;
		n.moveY = moveY;
	}
	return this;
}
Graph.prototype.edgedir = function(d)
{
	for (var i=0; i<this.edges.length; i++)
		this.edges[i].direction=d;;
	return this;
}
//cumulative edge length for optimizing the sort
//g.score(g.nodes.filter(function(x){return x.rank == 0}))
Graph.prototype.distances = function(nodes)
{
	var l =0;
	this.forEdges(nodes,function(edge){l+=vdist2.apply(null,edge.points)});
	return l;
}

Graph.prototype.dotLayout = function(direction,nodeSeparation,rankSeparation)
{	//reimplement the TSE93 algorithm
	//direction = 0 for left->right, 1 for top->bottom
	//rank
	//ordering
	//position
}

Graph.prototype.resetLayout = function()
{
	this.nodes.forEach(function(x){x.pos= [0,0]; x.force=[0,0]; x.rank=0;x.moveX = x.moveY = true;});
}

Graph.prototype.spring2 = function(iterations)
{
	/* potential function U(x) = A/x + x^2. F = -dU/dx
	force is A/x^2 (reuplsive) -2x (attractive)
	add a weak attractor to the [0,0] location to keep stuff together
	equilibrium distance is A/2 = x0^3, for x0=1, A=2
	U(x) = -A log(x) + x^2 is easier to compute
	F(x) = A / x - 2x, where A = 2 x0^2,
	*/
	iterations = iterations || 2;
	var weakAttractor = -0.0001;
	var maxRepulsion = 4;
	var timeStep = 0.05;
	var x0 = 1/2;
	var A = 2.0*x0*x0*timeStep;
	var maxVertexMovement = 5;
	var minDist = x0*timeStep/5; 
	var minDist2 = minDist*minDist;

	var nodes = this.nodes;
	var edges = this.edges;
	var n1, n2, e;
	var dx, dy, d2, force;
	var i, j, iter;
	for (iter=0; iter<iterations;iter++) //JIT compiler should do well here
	{
		for (i=1;i<nodes.length;i++) //repulsive 1/x potential
			for (j = 0; j < i; j++)
			{
				n1 = nodes[i]; n2 = nodes[j];
				if (!n1 || !n2) continue;
				dx = n2.pos[0] - n1.pos[0];
				dy = n2.pos[1] - n1.pos[1];
				d2 = dx*dx + dy*dy;
				if (d2 > minDist2 && d2 < maxRepulsion)
				{
					force = A / d2;
					n2.force[0] += force * dx;
					n2.force[1] += force * dy;
					n1.force[0] -= force * dx;
					n1.force[1] -= force * dy;
				}
			}
		for (i=0; i<edges.length;i++) //attractive x^2 potential
		{
			e = edges[i];
			n1 = e.source;
			n2 = e.target;
			dx = n2.pos[0] - n1.pos[0];
			dy = n2.pos[1] - n1.pos[1];
			d2 = dx*dx + dy*dy;
			if (d2 < minDist2)
			{
				force = e.weight * timeStep;
				n2.force[0] -= force * dx;
				n2.force[1] -= force * dy;
				n1.force[0] += force * dx;
				n1.force[1] += force * dy;
			}

		}
		for (i=0;i<nodes.length;i++) //move
		{
			var n = nodes[i];
			if (n.moveX) n.pos[0] += n.force[0]+minDist*(0.5-Math.random());
			if (n.moveY) n.pos[1] += n.force[1]+minDist*(0.5-Math.random());
			n.force[0] = weakAttractor * n.pos[0];
			n.force[1] = weakAttractor * n.pos[1];
		}

	}
	return this;
}

Graph.prototype.springLayout = function(iterations)
{
	iterations = iterations || 50 ;
    var rs = 8;
    var rc = .5;
    var rc2 = rc*rc;
    var rs2 = rs*rs;
    var k = 0.5;
    var q = 0.5;

    function offset(a,b,s)
	{
		a[0] += b[0]*s;
		a[1] += b[1]*s;
	}

    /*
    The standard force-directed layout uses a -q/(r-rc)^2 repulsion force ("Coulomb") and a -k(r-rs) spring attraction
    The equilibrium force will be at some point r > 0 if k*rs > q/rc^2
    Setting rc to the "width" of the object limits the attraction force and moves the equilibrium point farther away.
    The repulsion force should stop at distance rs.    Note: direction = r / |r|.

    Instead we use repel = 1/r, attract = 1/r also
    */
 	function repel(node1, node2) // actually 1/r
 	{
	    var r = vsub2(node2.pos,node1.pos);
	    var d2 = vlen2(r);
	    if (d2 < rc2) //overlap
	    {
	    	r = [Math.random()*rc, Math.random()*rc];
	    	d2=0;
	    }
	    else if (d2 >= rs2) return;
	    const f = k/(d2+rc2);
	    offset(node1.force, r, -f);
	    offset(node2.force, r, f);
	}

	// (r^2/k_a - k_a) * r / |r|
	function attract(edge) // 1/r
	{
	    var node1 = edge.source;
	    var node2 = edge.target;
	    //var r = vsub2(node2.pos,node1.pos);
		//var d2 = vlen2(r) + 0.1; // avoid massive forces at small distances (and divide by zero)
		//var f = Math.sqrt(d2)/2;

		//offset(node1.force,r,f)			// apply force to each end point
		//offset(node2.force,r,-f)			// apply force to each end point
		//return

	    var r = vsub2(node2.pos,node1.pos);
	    var d2 = vlen2(r)+rc2;
	    if (d2 < rc2) //overlap
	    {
	    	r = [Math.random()*rc, Math.random()*rc];
	    	d2=rc2;
	    }

	    //var d = Math.sqrt(d2);
	    var f = q/d2 * (1+Math.log(edge.weight)/2);
	    offset(node1.force, r, f);
	    offset(node2.force, r, -f);
	}

	function iter(nodes,edges)
	{
		var node;
		// Forces on nodes due to node-node repulsions
		for (var i=1; i<nodes.length; i++)
			for (var j=0;j<i;j++) 
		    	repel(nodes[i], nodes[j]);

	    // Forces on nodes due to edge weights
		for (var i=0; i<edges.length; i++)
	    	attract(edges[i]);

    	// Move by the given force
		for (var i=1; i<nodes.length; i++)
    	{
    		node = nodes[i];
    		if (node.moveX) node.pos[0] += node.force[0];
			if (node.moveY) node.pos[1] += node.force[1];
			node.force[0] = 0;
			node.force[1] = 0;
    	}
	}

	for (var i=0; i<iterations; i++)
		iter(this.nodes, this.edges);
	return this;
}

// connect(a->b->c)
Graph.prototype.parse = function(text)
{
	const self = this;
	if (text.indexOf('->') != -1)
	{
		var n = text.split('->').map(function(t){return self.node(t)});
		while (n.length > 1)
		{
			this.edge(n[0],n[1]).directed=true;
			n.shift();
		}
	}
	else if (text.indexOf('--') != -1)
	{
		var n = text.split('--').map(function(t){return self.node(t)});
		while (n.length > 1)
		{
			this.edge(n[0],n[1]);
			n.shift();
		}
	}
	return this;
}

function copyObject(o) {var r = {}; for (var n in o) r[n]=o[n]; return r;}
function css( element, property ) {return window.getComputedStyle( element, null ).getPropertyValue( property ); }
function fcss(element,property){return parseFloat(css(element,property));}
function copyStyle(s,n,x) { s.setAttribute(x,css(n,x)); }
function copyStyles(s,n,x) 
{
	var ns = window.getComputedStyle(n,null);
	for (var i=0;i<x.length; i++) s.setAttribute(x[i],ns.getPropertyValue(x[i])); 
}

// margin, border, padding
// See http://stackoverflow.com/questions/21064101/understanding-offsetwidth-clientwidth-scrollwidth-and-height-respectively/21064102
Graph.BoxModel = function(n,p) // n = DOM node, p = point of origin
{ 
  this.width = n.scrollWidth; //includes padding
  this.height = n.scrollHeight;
  this.x = p[0];
  this.y = p[1];
  this.stroke = '1pt solid black';

  var style =window.getComputedStyle( n, null );
  var args = ['margin-left','margin-right','margin-bottom','margin-top','border-left-width','border-right-width','border-bottom-width','border-top-width','padding-left','padding-right','padding-bottom','padding-top','fill-opacity','stroke-opacity'];
  for (var z in args) this[args[z]] = parseFloat(style.getPropertyValue(args[z]));
  this.stroke = style.getPropertyValue('border-left-color');
  this.fill = style.getPropertyValue('fill');
  
  var collapse = (n.tagName == 'TABLE' && style.getPropertyValue('border-collapse')=='collapse') ? 0 : 1;
  // [x ,y, w, h]
  var m = 1;
  this.border = [
    this.x+this['margin-left']+collapse*this['border-left-width']/m, 
    this.y+this['margin-top']+collapse*this['border-top-width']/m,
    this.width+collapse*(this['border-left-width']/m+this['border-right-width']/m),
    this.height+collapse*(this['border-top-width']/m+this['border-bottom-width']/m)];

  this.borderWidth = collapse*(this['border-right-width']+this['border-bottom-width'])/2;
  
  this.width -= this['padding-left']+this['padding-right'];
  this.height -= this['padding-top']+this['padding-bottom'];
  
  // [x, y, w, h]
  this.content = [
    this.x+this['margin-left']+this['border-left-width']+this['padding-left'],
    this.y+this['margin-top']+this['border-top-width']+this['padding-top'],
    this.width,this.height];
}

function drawRect(box,radius, width, stroke, fill) // [x,y,w,h], radius, color
{
  //<rect x="50" y="20" rx="20" ry="20" width="150" height="150" style="fill:red;stroke:black;stroke-width:5;opacity:0.5" />
  var r = document.createElementNS(Graph.svgNamespace, 'rect');
  r.setAttribute('x',box[0]);
  r.setAttribute('y',box[1]);
  r.setAttribute('width',box[2]);
  r.setAttribute('height',box[3]);
  r.setAttribute('rx',radius||0);
  r.setAttribute('ry',radius||0);
  r.setAttribute('stroke',stroke||'black');
  r.setAttribute('strokeWidth',width||2);
  r.setAttribute('fill','transparent');
  return r;
}


  function textRangeBounds(text, textNode, textOffset) {
    var range = doc.createRange();
    range.setStart(textNode, textOffset);
    range.setEnd(textNode, textOffset + text.length);
    return range.getBoundingClientRect();
  }

function getOffset( el , p) //offset , width, height relative to a parent
{
    var x = 0;
    var y = 0;
    while( el && el != p && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        x += el.offsetLeft - el.scrollLeft;
        y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return [x,y];
}
/*
function getOffset( el , p)
{
	if (!p || !el || el === p) return [0,0];

	return [el.scrollLeft + el.offsetLeft - p.scrollLeft, el.scrollTop + el.offsetTop - p.scrollTop ];
}*/
// copy the margin, border, padding box model
// http://apike.ca/prog_svg_text_style.html

Graph.text2svg = function(g,label,style)
{
	var s = document.createElementNS(Graph.svgNamespace,'text');
	s.setAttribute('x',5);
	s.setAttribute('y',5);
	s.setAttribute('width',7*label.length);
	s.setAttribute('dy','.6em');
	s.textContent = label;
	if (style) for (var n in style) s.setAttribute(n,style[n]);
	g.appendChild(s);
	return s;
}
Graph.DOM2SVG = function(g,n,originNode,box) //graph, node, parent, box
{
  var attrs = ['font-family','font-size','font-weight'];

  if (!originNode) originNode = n;
  var p = vsub2(getOffset(n),getOffset(originNode));
  if (box && n.nodeType === n.TEXT_NODE) 
      {
        var t = n.nodeValue.trim();
        if (t.length) 
          {
            var s = document.createElementNS(Graph.svgNamespace, 'text');
            s.setAttribute('x',box.content[0]);//-o[0]);
            s.setAttribute('y',box.content[1]);//-o[1]);
            //s.setAttribute('y',box.content[1]+box.content[3]/2+box['padding-top']);//-o[1]);
            s.setAttribute('width',box.content[2]);
            //s.setAttribute('alignment-baseline','middle'); //'text-before-edge'); 
            if (Graph.isIE)
              s.setAttribute('dy','.9em');
            else //webkit or mozilla
            {
              s.setAttribute('alignment-baseline','text-before-edge');//webkit
              s.setAttribute('style','dominant-baseline:text-before-edge'); //webkit
            //s.setAttribute('dominantBaseline','text-before-edge');//webkit
            }
            
            //s.innerHTML = t;
            s.textContent = t;
            attrs.forEach(function(x){copyStyle(s,n.parentElement||n.parentNode,x);})
            g.appendChild(s);
            //border
          }  
      }
  else if (n.nodeType === n.ELEMENT_NODE)
  {
     box = new Graph.BoxModel(n,p);
//<text x="0" y="35" font-family="Verdana" font-size="35">Hello, out there</text>

    if (box.borderWidth)
      g.appendChild(drawRect(box.border,fcss(n,'border-radius'),box.borderWidth,box.stroke,box.fill));
    
    if ('childNodes' in n && n.childNodes.length)
      for (var i=0; i<n.childNodes.length; i++) Graph.DOM2SVG(g,n.childNodes[i],originNode,box);
  }
}

Graph.html2svg2 = function(svg,n)
{
	var g = document.createElementNS(Graph.svgNamespace, 'g');
	//g.setAttribute('transform','translate(50 25)')
	svg.appendChild(g);
	Graph.DOM2SVG(g,n)
	if (n.parentElement) n.parentElement.removeChild(n);
	return g;
}


Graph.prototype.render = function(svg,fast)
{
	fast = fast || false;
	// setup marker definition if necessary
	if (!svg.querySelector('#arrow'))
	{
		var defs = null;
		if (!Graph.isIE) defs = svg.querySelector('defs');
		if (!defs) defs = Graph.svgtag(svg,'defs',null);
		var marker = Graph.svgtag(defs,'marker',{id:'arrow', markerWidth:10, markerHeight:10, refX:"10", refY:"5", orient:"auto", markerUnits:"strokeWidth"});
		marker.innerHTML = '<path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke">';
	}
    var bounds = this.bounds();
    var margin = 30;
    var width = Number(svg.getAttribute('width')) || svg.scrollWidth || 30;
    var height = Number(svg.getAttribute('height')) || svg.scrollHeight || 30;
    if (bounds.rangeX == 0) bounds.rangeX = bounds.rangeY ;
    else if (bounds.rangeY == 0) bounds.rangeY = bounds.rangeX ;
    if (bounds.rangeX == 0 ||bounds.rangeY == 0) return;
    var scaleX = (width-bounds.left-bounds.right-margin*2) / bounds.rangeX ;
    var scaleY = (height-bounds.top-bounds.bottom-margin*2) / bounds.rangeY ;
	for (var i=0;i<this.nodes.length;i++)
    {
    	var n = this.nodes[i];
    	n.x = bounds.left+margin+scaleX * (n.pos[0] - bounds.minX);
    	n.y = bounds.top+margin+scaleY * (n.pos[1] - bounds.minY);
    	n.draw(svg,fast);
    }

    for (var i=0;i<this.edges.length;i++)
    	this.edges[i].draw(svg,fast);
    this.svg = svg;
    return this;
}