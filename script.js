// Variables para IndexedDB
let db;
let dbReady = false;
let maquinariaEditando = null;
let idParaEliminar = null;

// Variables para mantenimientos
let mantenimientoEditando = null;
let idMantenimientoParaEliminar = null;

// Inicializar IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.warn('IndexedDB no disponible');
            resolve(false);
            return;
        }

        const dbName = 'MaquinariasAppDB';
        const request = indexedDB.open(dbName, 2);
        
        request.onerror = (event) => {
            console.warn('Error al abrir IndexedDB:', event.target.error);
            resolve(false);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            dbReady = true;
            console.log('✅ IndexedDB inicializado correctamente');
            resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Store para maquinarias
            if (!database.objectStoreNames.contains('maquinarias')) {
                const objectStore = database.createObjectStore('maquinarias', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                objectStore.createIndex('nombre', 'nombre', { unique: false });
                objectStore.createIndex('tipo', 'tipo', { unique: false });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                objectStore.createIndex('sincronizado', 'sincronizado', { unique: false });
                
                console.log('Object store "maquinarias" creado');
            }
            
            // Store para mantenimientos
            if (!database.objectStoreNames.contains('mantenimientos')) {
                const objectStore = database.createObjectStore('mantenimientos', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                objectStore.createIndex('maquinaria', 'maquinaria', { unique: false });
                objectStore.createIndex('tipo', 'tipo', { unique: false });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                objectStore.createIndex('sincronizado', 'sincronizado', { unique: false });
                
                console.log('Object store "mantenimientos" creado');
            }
            
            // Store genérico para otros módulos
            if (!database.objectStoreNames.contains('registros_genericos')) {
                const objectStore = database.createObjectStore('registros_genericos', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                objectStore.createIndex('modulo', 'modulo', { unique: false });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                objectStore.createIndex('sincronizado', 'sincronizado', { unique: false });
                
                console.log('Object store "registros_genericos" creado');
            }
        };
    });
}

// Guardar en IndexedDB
function guardarEnIndexedDB(maquinaria, sincronizado = false) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            reject('IndexedDB no está listo');
            return;
        }

        const registro = {
            ...maquinaria,
            timestamp: Date.now(),
            sincronizado: sincronizado
        };

        try {
            const transaction = db.transaction(['maquinarias'], 'readwrite');
            
            transaction.onerror = (event) => {
                console.error('Error en transacción:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log('✅ Maquinaria guardada:', registro);
                resolve(registro);
            };
            
            const objectStore = transaction.objectStore('maquinarias');
            const request = objectStore.add(registro);
            
            request.onerror = (event) => {
                console.error('Error al agregar registro:', event.target.error);
                reject(event.target.error);
            };
            
        } catch (error) {
            console.error('Error en try-catch:', error);
            reject(error);
        }
    });
}

// Actualizar en IndexedDB
function actualizarEnIndexedDB(id, maquinaria, sincronizado = false) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            reject('IndexedDB no está listo');
            return;
        }

        try {
            const transaction = db.transaction(['maquinarias'], 'readwrite');
            const objectStore = transaction.objectStore('maquinarias');
            
            const getRequest = objectStore.get(id);
            getRequest.onsuccess = (event) => {
                const registro = event.target.result;
                if (registro) {
                    const registroActualizado = {
                        ...registro,
                        ...maquinaria,
                        sincronizado: sincronizado
                    };
                    
                    const updateRequest = objectStore.put(registroActualizado);
                    updateRequest.onsuccess = () => {
                        console.log('✅ Maquinaria actualizada:', registroActualizado);
                        resolve(registroActualizado);
                    };
                    updateRequest.onerror = (event) => reject(event.target.error);
                } else {
                    reject('Registro no encontrado');
                }
            };
            getRequest.onerror = (event) => reject(event.target.error);
            
        } catch (error) {
            console.error('Error al actualizar registro:', error);
            reject(error);
        }
    });
}

// Eliminar de IndexedDB
function eliminarDeIndexedDB(id) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            resolve();
            return;
        }

        try {
            const transaction = db.transaction(['maquinarias'], 'readwrite');
            const objectStore = transaction.objectStore('maquinarias');
            const request = objectStore.delete(id);
            
            request.onsuccess = () => {
                console.log('✅ Maquinaria eliminada de IndexedDB:', id);
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error al eliminar registro:', event.target.error);
                resolve();
            };
            
        } catch (error) {
            console.error('Error al eliminar registro:', error);
            resolve();
        }
    });
}

// Obtener registros de IndexedDB
function obtenerDeIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            resolve([]);
            return;
        }

        try {
            const transaction = db.transaction(['maquinarias'], 'readonly');
            const objectStore = transaction.objectStore('maquinarias');
            const request = objectStore.getAll();
            
            request.onerror = (event) => {
                console.error('Error al obtener registros:', event.target.error);
                resolve([]);
            };
            
            request.onsuccess = (event) => {
                const registros = event.target.result || [];
                console.log('📋 Registros obtenidos:', registros);
                resolve(registros);
            };
            
        } catch (error) {
            console.error('Error al obtener registros:', error);
            resolve([]);
        }
    });
}

// Obtener solo registros no sincronizados
function obtenerRegistrosNoSincronizados() {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            resolve([]);
            return;
        }

        try {
            const transaction = db.transaction(['maquinarias'], 'readonly');
            const objectStore = transaction.objectStore('maquinarias');
            const request = objectStore.getAll();
            
            request.onsuccess = (event) => {
                const todosLosRegistros = event.target.result || [];
                const registrosNoSincronizados = todosLosRegistros.filter(reg => !reg.sincronizado);
                console.log('📋 Registros no sincronizados:', registrosNoSincronizados);
                resolve(registrosNoSincronizados);
            };
            
            request.onerror = (event) => {
                console.error('Error al obtener registros:', event.target.error);
                resolve([]);
            };
            
        } catch (error) {
            console.error('Error al obtener registros no sincronizados:', error);
            resolve([]);
        }
    });
}

// Verificar conexión a internet
function hayInternet() {
    return navigator.onLine;
}

// Mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    const elemento = document.getElementById('mensaje');
    if (elemento) {
        elemento.textContent = mensaje;
        elemento.className = `mensaje ${tipo}`;
        elemento.style.display = 'block';
        
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 5000);
    }
}

// FUNCIONES PARA MODALES DE MAQUINARIAS

// Abrir modal para agregar
function abrirModalAgregar() {
    maquinariaEditando = null;
    document.getElementById('modalTitulo').textContent = 'Agregar Maquinaria';
    limpiarFormulario();
    document.getElementById('modalMaquinaria').style.display = 'block';
}

// Abrir modal para editar
function abrirModalEditar(maquinaria) {
    maquinariaEditando = maquinaria;
    document.getElementById('modalTitulo').textContent = 'Editar Maquinaria';
    cargarDatosEnFormulario(maquinaria);
    document.getElementById('modalMaquinaria').style.display = 'block';
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modalMaquinaria').style.display = 'none';
    limpiarFormulario();
    maquinariaEditando = null;
}

// Limpiar formulario
function limpiarFormulario() {
    document.getElementById('formMaquinaria').reset();
}

// Cargar datos en formulario para editar
function cargarDatosEnFormulario(maquinaria) {
    document.getElementById('nombre').value = maquinaria.nombre || '';
    document.getElementById('tipo').value = maquinaria.tipo || '';
    document.getElementById('modelo').value = maquinaria.modelo || '';
    document.getElementById('serie').value = maquinaria.serie || '';
    document.getElementById('año').value = maquinaria.año || '';
    document.getElementById('estado').value = maquinaria.estado || '';
    document.getElementById('ubicacion').value = maquinaria.ubicacion || '';
}

// Guardar maquinaria (agregar o editar)
function guardarMaquinaria() {
    const boton = document.getElementById('btnGuardar');
    boton.disabled = true;
    boton.textContent = 'Guardando...';
    
    const maquinaria = {
        nombre: document.getElementById('nombre').value.trim(),
        tipo: document.getElementById('tipo').value.trim(),
        modelo: document.getElementById('modelo').value.trim(),
        serie: document.getElementById('serie').value.trim(),
        año: document.getElementById('año').value.trim(),
        estado: document.getElementById('estado').value.trim(),
        ubicacion: document.getElementById('ubicacion').value.trim(),
        fecha: new Date().toLocaleString()
    };
    
    // Validar campos requeridos
    if (!maquinaria.nombre || !maquinaria.tipo || !maquinaria.modelo || !maquinaria.serie || !maquinaria.año || !maquinaria.estado || !maquinaria.ubicacion) {
        mostrarMensaje('Por favor completa todos los campos', 'error');
        boton.disabled = false;
        boton.textContent = 'Guardar';
        return;
    }
    
    if (maquinariaEditando) {
        // Editar maquinaria existente
        if (hayInternet()) {
            editarEnDrive(maquinariaEditando.id, maquinaria);
        } else {
            editarLocalmente(maquinariaEditando.id, maquinaria);
        }
    } else {
        // Agregar nueva maquinaria
        if (hayInternet()) {
            registrarEnDrive(maquinaria);
        } else {
            guardarLocalmente(maquinaria);
        }
    }
}

// Guardar localmente
function guardarLocalmente(maquinaria) {
    if (!dbReady) {
        mostrarMensaje('❌ Base de datos no está disponible', 'error');
        resetearBotonGuardar();
        return;
    }

    guardarEnIndexedDB(maquinaria, false)
        .then((registro) => {
            mostrarMensaje('✅ Maquinaria guardada localmente (sin internet)', 'success');
            cerrarModal();
            cargarTodosLosRegistros();
        })
        .catch(error => {
            console.error('❌ Error al guardar localmente:', error);
            mostrarMensaje('❌ Error al guardar: ' + error.message, 'error');
        })
        .finally(() => {
            resetearBotonGuardar();
        });
}

// Editar localmente
function editarLocalmente(id, maquinaria) {
    if (!dbReady) {
        mostrarMensaje('❌ Base de datos no está disponible', 'error');
        resetearBotonGuardar();
        return;
    }

    actualizarEnIndexedDB(id, maquinaria, false)
        .then((registro) => {
            mostrarMensaje('✅ Maquinaria actualizada localmente (sin internet)', 'success');
            cerrarModal();
            cargarTodosLosRegistros();
        })
        .catch(error => {
            console.error('❌ Error al actualizar localmente:', error);
            mostrarMensaje('❌ Error al actualizar: ' + error.message, 'error');
        })
        .finally(() => {
            resetearBotonGuardar();
        });
}

// Eliminar localmente
function eliminarLocalmente(id) {
    eliminarDeIndexedDB(id).then(() => {
        mostrarMensaje('✅ Maquinaria eliminada localmente (sin internet)', 'success');
        cerrarModalConfirmar();
        cargarTodosLosRegistros();
    });
}

// Resetear botón guardar
function resetearBotonGuardar() {
    const boton = document.getElementById('btnGuardar');
    if (boton) {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

// Cargar todos los registros
function cargarTodosLosRegistros() {
    const lista = document.getElementById('listaRegistros');
    if (!lista) return;
    
    lista.innerHTML = '<p class="no-registros">Cargando registros...</p>';
    
    Promise.all([
        obtenerDeIndexedDB(),
        obtenerRegistrosDeDrive()
    ]).then(([locales, drive]) => {
        // Combinar registros evitando duplicados
        const todosLosRegistros = [...drive];
        
        // Agregar registros locales que no estén en drive
        locales.forEach(local => {
            if (!local.sincronizado && !todosLosRegistros.find(d => d.id === local.id)) {
                todosLosRegistros.push(local);
            }
        });
        
        mostrarRegistros(todosLosRegistros);
    }).catch(error => {
        console.error('Error al cargar registros:', error);
        obtenerDeIndexedDB().then(locales => {
            mostrarRegistros(locales);
        });
    });
}

// Mostrar registros en la lista
function mostrarRegistros(registros) {
    const lista = document.getElementById('listaRegistros');
    if (!lista) return;
    
    if (registros.length === 0) {
        lista.innerHTML = '<p class="no-registros">No hay maquinarias registradas</p>';
        return;
    }
    
    lista.innerHTML = registros.map(maquinaria => {
        const origen = maquinaria.sincronizado === false ? 'local' : 'drive';
        const origenTexto = origen === 'local' ? 'LOCAL' : 'DRIVE';
        
        return `
            <div class="maquinaria-item">
                <div class="maquinaria-info">
                    <div class="maquinaria-nombre">${maquinaria.nombre}</div>
                    <div class="maquinaria-detalles">
                        <span class="detalle-item">
                            <span class="detalle-label">Tipo:</span> ${maquinaria.tipo}
                        </span>
                        <span class="detalle-item">
                            <span class="detalle-label">Modelo:</span> ${maquinaria.modelo}
                        </span>
                        <span class="detalle-item">
                            <span class="detalle-label">Serie:</span> ${maquinaria.serie}
                        </span>
                        <span class="detalle-item">
                            <span class="detalle-label">Año:</span> ${maquinaria.año}
                        </span>
                    </div>
                    <div class="maquinaria-detalles">
                        <span class="detalle-item">
                            <span class="detalle-label">Ubicación:</span> ${maquinaria.ubicacion}
                        </span>
                        <span class="estado-badge estado-${maquinaria.estado.toLowerCase().replace(' ', '-')}">${maquinaria.estado}</span>
                        <span class="origen-badge ${origen}">${origenTexto}</span>
                    </div>
                    <div class="fecha-registro">Registrado: ${maquinaria.fecha}</div>
                </div>
                <div class="maquinaria-acciones">
                    <button class="btn-accion btn-editar" onclick="abrirModalEditar(${JSON.stringify(maquinaria).replace(/"/g, '&quot;')})">
                        ✏️ Editar
                    </button>
                    <button class="btn-accion btn-eliminar" onclick="confirmarEliminar(${maquinaria.id})">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Confirmar eliminación
function confirmarEliminar(id) {
    idParaEliminar = id;
    document.getElementById('mensajeConfirmacion').textContent = '¿Estás seguro de que deseas eliminar esta maquinaria?';
    document.getElementById('modalConfirmar').style.display = 'block';
}

// Cerrar modal de confirmación
function cerrarModalConfirmar() {
    document.getElementById('modalConfirmar').style.display = 'none';
    idParaEliminar = null;
}

// Confirmar eliminación
function confirmarEliminacion() {
    if (idParaEliminar) {
        if (hayInternet()) {
            eliminarEnDrive(idParaEliminar);
        } else {
            eliminarLocalmente(idParaEliminar);
        }
    }
}

// Forzar sincronización
function forzarSincronizacion() {
    sincronizarRegistrosPendientes();
}

// Instalar app
function instalarApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuario aceptó instalar la app');
            } else {
                console.log('Usuario rechazó instalar la app');
            }
            deferredPrompt = null;
        });
    }
}

// Variables PWA
let deferredPrompt;

// Inicializar aplicación
window.addEventListener('load', () => {
    // Inicializar IndexedDB
    initIndexedDB().then(() => {
        console.log('✅ Aplicación inicializada');
        
        // Cargar registros si estamos en la página principal
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            cargarTodosLosRegistros();
        }
    });
    
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('❌ Error al registrar Service Worker:', error);
            });
    }
});

// Manejar prompt de instalación
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const btnInstalar = document.getElementById('btnInstalar');
    if (btnInstalar) {
        btnInstalar.style.display = 'block';
    }
});

// =================================================
// FUNCIONES PARA MANTENIMIENTOS
// =================================================

// Mostrar mensajes para mantenimientos
function mostrarMensajeMantenimiento(mensaje, tipo) {
    const elemento = document.getElementById('mensaje');
    if (elemento) {
        elemento.textContent = mensaje;
        elemento.className = `mensaje ${tipo}`;
        elemento.style.display = 'block';
        
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 5000);
    }
}

// Abrir modal para agregar mantenimiento
function abrirModalAgregarMantenimiento() {
    mantenimientoEditando = null;
    const modalTitulo = document.getElementById('modalTitulo');
    if (modalTitulo) {
        modalTitulo.textContent = 'Agregar Mantenimiento';
    }
    limpiarFormularioMantenimiento();
    const modal = document.getElementById('modalMantenimiento');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Abrir modal para editar mantenimiento
function abrirModalEditarMantenimiento(mantenimiento) {
    mantenimientoEditando = mantenimiento;
    const modalTitulo = document.getElementById('modalTitulo');
    if (modalTitulo) {
        modalTitulo.textContent = 'Editar Mantenimiento';
    }
    cargarDatosEnFormularioMantenimiento(mantenimiento);
    const modal = document.getElementById('modalMantenimiento');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Cerrar modal de mantenimiento
function cerrarModalMantenimiento() {
    const modal = document.getElementById('modalMantenimiento');
    if (modal) {
        modal.style.display = 'none';
    }
    limpiarFormularioMantenimiento();
    mantenimientoEditando = null;
}

// Limpiar formulario de mantenimiento
function limpiarFormularioMantenimiento() {
    const form = document.getElementById('formMantenimiento');
    if (form) {
        form.reset();
    }
}

// Cargar datos en formulario para editar mantenimiento
function cargarDatosEnFormularioMantenimiento(mantenimiento) {
    const campos = ['maquinaria', 'tipo', 'tecnico', 'horometro', 'descripcion', 'costo', 'estado'];
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            elemento.value = mantenimiento[campo] || '';
        }
    });
}

// Guardar mantenimiento (agregar o editar)
function guardarMantenimiento() {
    const boton = document.getElementById('btnGuardar');
    if (boton) {
        boton.disabled = true;
        boton.textContent = 'Guardando...';
    }
    
    const mantenimiento = {
        maquinaria: document.getElementById('maquinaria')?.value.trim() || '',
        tipo: document.getElementById('tipo')?.value.trim() || '',
        tecnico: document.getElementById('tecnico')?.value.trim() || '',
        horometro: document.getElementById('horometro')?.value.trim() || '',
        descripcion: document.getElementById('descripcion')?.value.trim() || '',
        costo: document.getElementById('costo')?.value.trim() || '',
        estado: document.getElementById('estado')?.value.trim() || '',
        fecha: new Date().toLocaleString()
    };
    
    // Validar campos requeridos
    if (!mantenimiento.maquinaria || !mantenimiento.tipo || !mantenimiento.tecnico || 
        !mantenimiento.horometro || !mantenimiento.descripcion || !mantenimiento.costo || !mantenimiento.estado) {
        mostrarMensajeMantenimiento('Por favor completa todos los campos', 'error');
        resetearBotonMantenimiento();
        return;
    }
    
    if (mantenimientoEditando) {
        // Editar mantenimiento existente
        if (hayInternet()) {
            editarMantenimientoEnDrive(mantenimientoEditando.id, mantenimiento);
        } else {
            editarMantenimientoLocal(mantenimientoEditando.id, mantenimiento);
        }
    } else {
        // Agregar nuevo mantenimiento
        if (hayInternet()) {
            registrarMantenimientoEnDrive(mantenimiento);
        } else {
            guardarMantenimientoLocal(mantenimiento);
        }
    }
}

// Guardar mantenimiento localmente
function guardarMantenimientoLocal(mantenimiento) {
    if (!dbReady) {
        mostrarMensajeMantenimiento('❌ Base de datos no está disponible', 'error');
        resetearBotonMantenimiento();
        return;
    }

    guardarEnIndexedDBMantenimiento(mantenimiento, false)
        .then((registro) => {
            mostrarMensajeMantenimiento('✅ Mantenimiento guardado localmente (sin internet)', 'success');
            cerrarModalMantenimiento();
            cargarMantenimientos();
        })
        .catch(error => {
            console.error('❌ Error al guardar mantenimiento localmente:', error);
            mostrarMensajeMantenimiento('❌ Error al guardar: ' + error.message, 'error');
        })
        .finally(() => {
            resetearBotonMantenimiento();
        });
}

// Editar mantenimiento localmente
function editarMantenimientoLocal(id, mantenimiento) {
    if (!dbReady) {
        mostrarMensajeMantenimiento('❌ Base de datos no está disponible', 'error');
        resetearBotonMantenimiento();
        return;
    }

    actualizarEnIndexedDBMantenimiento(id, mantenimiento, false)
        .then((registro) => {
            mostrarMensajeMantenimiento('✅ Mantenimiento actualizado localmente (sin internet)', 'success');
            cerrarModalMantenimiento();
            cargarMantenimientos();
        })
        .catch(error => {
            console.error('❌ Error al actualizar mantenimiento localmente:', error);
            mostrarMensajeMantenimiento('❌ Error al actualizar: ' + error.message, 'error');
        })
        .finally(() => {
            resetearBotonMantenimiento();
        });
}

// Eliminar mantenimiento localmente
function eliminarMantenimientoLocal(id) {
    eliminarDeIndexedDBMantenimiento(id).then(() => {
        mostrarMensajeMantenimiento('✅ Mantenimiento eliminado localmente (sin internet)', 'success');
        cerrarModalConfirmarMantenimiento();
        cargarMantenimientos();
    });
}

// Resetear botón de mantenimiento
function resetearBotonMantenimiento() {
    const boton = document.getElementById('btnGuardar');
    if (boton) {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

// Guardar en IndexedDB mantenimiento
function guardarEnIndexedDBMantenimiento(mantenimiento, sincronizado = false) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            reject('IndexedDB no está listo');
            return;
        }

        const registro = {
            ...mantenimiento,
            timestamp: Date.now(),
            sincronizado: sincronizado
        };

        try {
            const transaction = db.transaction(['mantenimientos'], 'readwrite');
            
            transaction.onerror = (event) => {
                console.error('Error en transacción mantenimiento:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log('✅ Mantenimiento guardado:', registro);
                resolve(registro);
            };
            
            const objectStore = transaction.objectStore('mantenimientos');
            const request = objectStore.add(registro);
            
            request.onerror = (event) => {
                console.error('Error al agregar mantenimiento:', event.target.error);
                reject(event.target.error);
            };
            
        } catch (error) {
            console.error('Error en try-catch mantenimiento:', error);
            reject(error);
        }
    });
}

// Actualizar en IndexedDB mantenimiento
function actualizarEnIndexedDBMantenimiento(id, mantenimiento, sincronizado = false) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            reject('IndexedDB no está listo');
            return;
        }

        try {
            const transaction = db.transaction(['mantenimientos'], 'readwrite');
            const objectStore = transaction.objectStore('mantenimientos');
            
            const getRequest = objectStore.get(id);
            getRequest.onsuccess = (event) => {
                const registro = event.target.result;
                if (registro) {
                    const registroActualizado = {
                        ...registro,
                        ...mantenimiento,
                        sincronizado: sincronizado
                    };
                    
                    const updateRequest = objectStore.put(registroActualizado);
                    updateRequest.onsuccess = () => {
                        console.log('✅ Mantenimiento actualizado:', registroActualizado);
                        resolve(registroActualizado);
                    };
                    updateRequest.onerror = (event) => reject(event.target.error);
                } else {
                    reject('Mantenimiento no encontrado');
                }
            };
            getRequest.onerror = (event) => reject(event.target.error);
            
        } catch (error) {
            console.error('Error al actualizar mantenimiento:', error);
            reject(error);
        }
    });
}

// Eliminar de IndexedDB mantenimiento
function eliminarDeIndexedDBMantenimiento(id) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            resolve();
            return;
        }

        try {
            const transaction = db.transaction(['mantenimientos'], 'readwrite');
            const objectStore = transaction.objectStore('mantenimientos');
            const request = objectStore.delete(id);
            
            request.onsuccess = () => {
                console.log('✅ Mantenimiento eliminado de IndexedDB:', id);
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error al eliminar mantenimiento:', event.target.error);
                resolve();
            };
            
        } catch (error) {
            console.error('Error al eliminar mantenimiento:', error);
            resolve();
        }
    });
}

// Obtener mantenimientos de IndexedDB
function obtenerDeIndexedDBMantenimientos() {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            resolve([]);
            return;
        }

        try {
            const transaction = db.transaction(['mantenimientos'], 'readonly');
            const objectStore = transaction.objectStore('mantenimientos');
            const request = objectStore.getAll();
            
            request.onerror = (event) => {
                console.error('Error al obtener mantenimientos:', event.target.error);
                resolve([]);
            };
            
            request.onsuccess = (event) => {
                const registros = event.target.result || [];
                console.log('📋 Mantenimientos obtenidos:', registros);
                resolve(registros);
            };
            
        } catch (error) {
            console.error('Error al obtener mantenimientos:', error);
            resolve([]);
        }
    });
}

// Cargar mantenimientos
function cargarMantenimientos() {
    const lista = document.getElementById('listaRegistros');
    if (!lista) return;
    
    lista.innerHTML = '<p class="no-registros">Cargando mantenimientos...</p>';
    
    Promise.all([
        obtenerDeIndexedDBMantenimientos(),
        obtenerMantenimientosDeDrive()
    ]).then(([locales, drive]) => {
        // Combinar registros evitando duplicados
        const todosLosMantenimientos = [...drive];
        
        // Agregar registros locales que no estén en drive
        locales.forEach(local => {
            if (!local.sincronizado && !todosLosMantenimientos.find(d => d.id === local.id)) {
                todosLosMantenimientos.push(local);
            }
        });
        
        mostrarMantenimientos(todosLosMantenimientos);
    }).catch(error => {
        console.error('Error al cargar mantenimientos:', error);
        obtenerDeIndexedDBMantenimientos().then(locales => {
            mostrarMantenimientos(locales);
        });
    });
}

// Mostrar mantenimientos en la lista
function mostrarMantenimientos(mantenimientos) {
    const lista = document.getElementById('listaRegistros');
    if (!lista) return;
    
    if (mantenimientos.length === 0) {
        lista.innerHTML = '<p class="no-registros">No hay mantenimientos registrados</p>';
        return;
    }
    
    lista.innerHTML = mantenimientos.map(mantenimiento => {
        const origen = mantenimiento.sincronizado === false ? 'local' : 'drive';
        const origenTexto = origen === 'local' ? 'LOCAL' : 'DRIVE';
        
        return `
            <div class="maquinaria-item">
                <div class="maquinaria-info">
                    <div class="maquinaria-nombre">${mantenimiento.maquinaria} - ${mantenimiento.tipo}</div>
                    <div class="maquinaria-detalles">
                        <span class="detalle-item">
                            <span class="detalle-label">Técnico:</span> ${mantenimiento.tecnico}
                        </span>
                        <span class="detalle-item">
                            <span class="detalle-label">Horómetro:</span> ${mantenimiento.horometro}h
                        </span>
                        <span class="detalle-item">
                            <span class="detalle-label">Costo:</span> $${mantenimiento.costo}
                        </span>
                    </div>
                    <div class="maquinaria-detalles">
                        <span class="detalle-item">
                            <span class="detalle-label">Descripción:</span> ${mantenimiento.descripcion}
                        </span>
                    </div>
                    <div class="maquinaria-detalles">
                        <span class="estado-badge estado-${mantenimiento.estado.toLowerCase().replace(' ', '-')}">${mantenimiento.estado}</span>
                        <span class="origen-badge ${origen}">${origenTexto}</span>
                    </div>
                    <div class="fecha-registro">Fecha: ${mantenimiento.fecha}</div>
                </div>
                <div class="maquinaria-acciones">
                    <button class="btn-accion btn-editar" onclick="abrirModalEditarMantenimiento(${JSON.stringify(mantenimiento).replace(/"/g, '&quot;')})">
                        ✏️ Editar
                    </button>
                    <button class="btn-accion btn-eliminar" onclick="confirmarEliminarMantenimiento(${mantenimiento.id})">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Confirmar eliminación de mantenimiento
function confirmarEliminarMantenimiento(id) {
    idMantenimientoParaEliminar = id;
    document.getElementById('mensajeConfirmacion').textContent = '¿Estás seguro de que deseas eliminar este mantenimiento?';
    document.getElementById('modalConfirmar').style.display = 'block';
}

// Cerrar modal de confirmación de mantenimiento
function cerrarModalConfirmarMantenimiento() {
    document.getElementById('modalConfirmar').style.display = 'none';
    idMantenimientoParaEliminar = null;
}

// Confirmar eliminación de mantenimiento
function confirmarEliminacionMantenimiento() {
    if (idMantenimientoParaEliminar) {
        if (hayInternet()) {
            eliminarMantenimientoEnDrive(idMantenimientoParaEliminar);
        } else {
            eliminarMantenimientoLocal(idMantenimientoParaEliminar);
        }
    }
}

// Cargar mantenimientos cuando la página esté lista
if (window.location.pathname.includes('mantenimientos.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        initIndexedDB().then(() => {
            cargarMantenimientos();
        });
    });
}

// =================================================
// FUNCIONES GENÉRICAS PARA OTROS MÓDULOS
// =================================================

// Mostrar mensaje genérico
function mostrarMensajeGenerico(mensaje, tipo) {
    const elemento = document.getElementById('mensaje');
    if (elemento) {
        elemento.textContent = mensaje;
        elemento.className = `mensaje ${tipo}`;
        elemento.style.display = 'block';
        
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 5000);
    }
}

// Cerrar modal genérico
function cerrarModalGenerico() {
    // Intentar cerrar cualquier modal abierto
    const modales = ['modalMantenimiento', 'modalProgramacion', 'modalHorometros', 'modalMovimiento', 'modalReportes', 'modalInventario', 'modalPersonal', 'modalConfiguracion'];
    modales.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    });
}

// Resetear botón genérico
function resetearBotonGenerico() {
    const boton = document.getElementById('btnGuardar');
    if (boton) {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

// Cargar registros de módulo genérico
function cargarRegistrosModulo(modulo) {
    const lista = document.getElementById('listaRegistros');
    if (!lista) return;
    
    lista.innerHTML = '<p class="no-registros">Cargando registros...</p>';
    
    obtenerRegistrosModulo(modulo).then(registros => {
        mostrarRegistrosGenericos(registros);
    }).catch(error => {
        console.error(`Error al cargar registros de ${modulo}:`, error);
        lista.innerHTML = '<p class="no-registros">Error al cargar registros</p>';
    });
}

// Mostrar registros genéricos
function mostrarRegistrosGenericos(registros) {
    const lista = document.getElementById('listaRegistros');
    if (!lista) return;
    
    if (registros.length === 0) {
        lista.innerHTML = '<p class="no-registros">No hay registros</p>';
        return;
    }
    
    lista.innerHTML = registros.map(registro => {
        const origen = registro.sincronizado === false ? 'local' : 'drive';
        const origenTexto = origen === 'local' ? 'LOCAL' : 'DRIVE';
        
        return `
            <div class="maquinaria-item">
                <div class="maquinaria-info">
                    <div class="maquinaria-nombre">${registro.nombre || registro.maquinaria || registro.tecnico || 'Sin nombre'}</div>
                    <div class="maquinaria-detalles">
                        ${Object.entries(registro).map(([key, value]) => {
                            if (key !== 'id' && key !== 'timestamp' && key !== 'sincronizado' && key !== 'fechaRegistro') {
                                return `
                                    <span class="detalle-item">
                                        <span class="detalle-label">${key}:</span> ${value}
                                    </span>
                                `;
                            }
                            return '';
                        }).join('')}
                    </div>
                    <div class="maquinaria-detalles">
                        <span class="origen-badge ${origen}">${origenTexto}</span>
                    </div>
                    <div class="fecha-registro">Fecha: ${registro.fechaRegistro || registro.fecha}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Guardar localmente en módulo genérico
function guardarLocalmenteModulo(modulo, datos) {
    // Usar localStorage como fallback simple
    const clave = `${modulo}_registros`;
    const registros = JSON.parse(localStorage.getItem(clave) || '[]');
    datos.id = Date.now();
    datos.fechaRegistro = new Date().toLocaleString();
    registros.push(datos);
    localStorage.setItem(clave, JSON.stringify(registros));
    
    mostrarMensajeGenerico('✅ Registro guardado localmente', 'success');
    cerrarModalGenerico();
    cargarRegistrosModulo(modulo);
    resetearBotonGenerico();
}