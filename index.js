const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json()); // content-type: application/json
const port = 3000;

// Función para leer datos del archivo JSON
const leerDatos = () => {
    try {
        const datos = fs.readFileSync("./datos.json");
        return JSON.parse(datos);
    } catch (error) {
        console.log(error);
    }
};

// Función para escribir datos al archivo JSON
const escribirDatos = (datos) => {
    try {
        fs.writeFileSync("./datos.json", JSON.stringify(datos, null, 2));
    } catch (error) {
        console.log(error);
    }
};

// RUTA BASE
app.get('/', (req, res) => {
    res.send("Bienvenido al Sistema de Facturación Automatizada 💳📜");
});

// ------------------- CLIENTES -----------------------
app.get('/clientes', (req, res) => {
    const datos = leerDatos();
    res.json(datos.clientes);
});

app.get('/buscarclientes/:id', (req, res) => {
    const datos = leerDatos();
    const cliente = datos.clientes.find(c => c.id === parseInt(req.params.id));
    if (cliente) {
        res.json(cliente);
    } else {
        res.status(404).send("Cliente no encontrado.");
    }
});

app.post('/subirclientes', (req, res) => {
    const datos = leerDatos();
    const nuevoCliente = {
        id: datos.clientes.length + 1,
        ...req.body
    };
    datos.clientes.push(nuevoCliente);
    escribirDatos(datos);
    res.json(nuevoCliente);
});

// ------------------- PRODUCTOS -----------------------
app.get('/listarproductos', (req, res) => {
    const datos = leerDatos();
    res.json(datos.productos);
});

app.post('/subirproductos', (req, res) => {
    const datos = leerDatos();
    const nuevoProducto = {
        id: datos.productos.length + 1,
        ...req.body
    };
    datos.productos.push(nuevoProducto);
    escribirDatos(datos);
    res.json(nuevoProducto);
});

// ------------------- FACTURAS -----------------------
app.get('/facturas', (req, res) => {
    const datos = leerDatos();
    res.json(datos.facturas);
});

app.get('/buscarfacturas/:id', (req, res) => {
    const datos = leerDatos();
    const factura = datos.facturas.find(f => f.id === parseInt(req.params.id));
    if (factura) {
        res.json(factura);
    } else {
        res.status(404).send("Factura no encontrada.");
    }
});

app.post('/subirfacturas', (req, res) => {
    const datos = leerDatos();
    const { cliente_id, items } = req.body;

    // Validar cliente
    const cliente = datos.clientes.find(c => c.id === cliente_id);
    if (!cliente) {
        return res.status(404).send("Cliente no encontrado.");
    }

    // Generar factura
    const nuevaFactura = {
        id: datos.facturas.length + 1,
        cliente_id,
        fecha: new Date().toISOString(),
        items: items.map(item => {
            const producto = datos.productos.find(p => p.id === item.producto_id);
            if (!producto) {
                throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
            }
            return {
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                subtotal: producto.precio * item.cantidad
            };
        }),
        total: items.reduce((acc, item) => {
            const producto = datos.productos.find(p => p.id === item.producto_id);
            return acc + (producto.precio * item.cantidad);
        }, 0),
        estado: "Pendiente"
    };

    datos.facturas.push(nuevaFactura);
    escribirDatos(datos);
    res.json(nuevaFactura);
});

// ------------------- RECIBOS -----------------------
app.get('/listarrecibos', (req, res) => {
    const datos = leerDatos();
    res.json(datos.recibos);
});

app.post('/subirrecibos', (req, res) => {
    const datos = leerDatos();
    const { factura_id, monto, metodo_pago } = req.body;

    // Validar factura
    const factura = datos.facturas.find(f => f.id === factura_id);
    if (!factura) {
        return res.status(404).send("Factura no encontrada.");
    }

    // Validar monto
    if (monto > factura.total) {
        return res.status(400).send("El monto excede el total de la factura.");
    }

    // Generar recibo
    const nuevoRecibo = {
        id: datos.recibos.length + 1,
        factura_id,
        fecha: new Date().toISOString(),
        monto,
        metodo_pago
    };

    // Actualizar estado de la factura
    factura.total -= monto;
    factura.estado = factura.total === 0 ? "Pagado" : "Pendiente";

    datos.recibos.push(nuevoRecibo);
    escribirDatos(datos);
    res.json(nuevoRecibo);
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
