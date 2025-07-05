// Tu URL de Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1vDHm7yH5nNyNolwWwPVErpTB_ZWw2FC87xH7NqTd3dDNEIIuDP1xsSTU6Cx7EjFnxQ/exec';

// Registrar en Google Drive
function registrarEnDrive(maquinaria) {
    const callbackName = 'callback_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            mostrarMensaje('✅ ¡Maquinaria registrada correctamente!', 'success');
            cerrarModal();
            
            setTimeout(() => {
                cargarTodosLosRegistros();
            }, 500);
            
            setTimeout(() => {
                sincronizarRegistrosPendientes();
            }, 1000);
        } else {
            console.log('❌ Error en Drive, guardando localmente');
            guardarLocalmente(maquinaria);
        }
        
        limpiarScript(script, callbackName);
        resetearBotonGuardar();
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log('❌ Error de conexión, guardando localmente');
        guardarLocalmente(maquinaria);
        limpiarScript(script, callbackName);
    };
    
    const params = new URLSearchParams({
        accion: 'registrar',
        modulo: 'maquinarias',
        datos: JSON.stringify(maquinaria),
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Editar en Google Drive
function editarEnDrive(id, maquinaria) {
    const callbackName = 'callback_edit_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            mostrarMensaje('✅ ¡Maquinaria actualizada correctamente!', 'success');
            cerrarModal();
            
            setTimeout(() => {
                cargarTodosLosRegistros();
            }, 500);
        } else {
            console.log('❌ Error en Drive, editando localmente');
            editarLocalmente(id, maquinaria);
        }
        
        limpiarScript(script, callbackName);
        resetearBotonGuardar();
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log('❌ Error de conexión, editando localmente');
        editarLocalmente(id, maquinaria);
        limpiarScript(script, callbackName);
    };
    
    const params = new URLSearchParams({
        accion: 'editar',
        modulo: 'maquinarias',
        id: id,
        datos: JSON.stringify(maquinaria),
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Eliminar en Google Drive
function eliminarEnDrive(id) {
    const callbackName = 'callback_delete_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            mostrarMensaje('✅ Maquinaria eliminada correctamente', 'success');
            cerrarModalConfirmar();
            
            setTimeout(() => {
                cargarTodosLosRegistros();
            }, 500);
        } else {
            console.log('❌ Error en Drive, eliminando localmente');
            eliminarLocalmente(id);
        }
        
        limpiarScript(script, callbackName);
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log('❌ Error de conexión, eliminando localmente');
        eliminarLocalmente(id);
        limpiarScript(script, callbackName);
    };
    
    const params = new URLSearchParams({
        accion: 'eliminar',
        modulo: 'maquinarias',
        id: id,
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Sincronizar registros pendientes
function sincronizarRegistrosPendientes() {
    if (!hayInternet() || !dbReady) {
        return;
    }
    
    obtenerRegistrosNoSincronizados()
        .then(registros => {
            if (registros.length === 0) {
                console.log('✅ No hay registros pendientes de sincronizar');
                return;
            }
            
            console.log(`🔄 Sincronizando ${registros.length} registros pendientes...`);
            mostrarMensaje(`🔄 Sincronizando ${registros.length} registros pendientes...`, 'success');
            
            sincronizarRegistro(registros, 0);
        });
}

// Sincronizar un registro individual
function sincronizarRegistro(registros, index) {
    if (index >= registros.length) {
        console.log('✅ Sincronización completada');
        mostrarMensaje(`✅ ${registros.length} registros sincronizados con Drive`, 'success');
        
        setTimeout(() => {
            cargarTodosLosRegistros();
        }, 1000);
        
        return;
    }
    
    const registro = registros[index];
    const callbackName = 'callback_sync_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            console.log(`✅ Registro ${index + 1} sincronizado:`, registro.nombre);
            
            eliminarDeIndexedDB(registro.id).then(() => {
                console.log('🧹 Registro local eliminado después de sincronizar');
            });
        } else {
            console.log(`❌ Error al sincronizar registro ${index + 1}:`, registro.nombre);
        }
        
        limpiarScript(script, callbackName);
        setTimeout(() => sincronizarRegistro(registros, index + 1), 500);
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log(`❌ Error de conexión al sincronizar registro ${index + 1}`);
        limpiarScript(script, callbackName);
        setTimeout(() => sincronizarRegistro(registros, index + 1), 500);
    };
    
    const maquinaria = {
        nombre: registro.nombre,
        tipo: registro.tipo,
        modelo: registro.modelo,
        serie: registro.serie,
        año: registro.año,
        estado: registro.estado,
        ubicacion: registro.ubicacion,
        fecha: registro.fecha
    };
    
    const params = new URLSearchParams({
        accion: 'registrar',
        modulo: 'maquinarias',
        datos: JSON.stringify(maquinaria),
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Obtener registros de Google Drive
function obtenerRegistrosDeDrive() {
    return new Promise((resolve) => {
        if (!hayInternet()) {
            resolve([]);
            return;
        }
        
        const callbackName = 'callback_listar_' + Date.now();
        const script = document.createElement('script');
        
        const timeout = setTimeout(() => {
            script.onerror();
        }, 8000);
        
        window[callbackName] = function(data) {
            clearTimeout(timeout);
            
            if (data && data.success && (data.maquinarias || data.registros)) {
                const registros = data.maquinarias || data.registros;
                console.log('📋 Registros obtenidos de Drive:', registros);
                resolve(registros);
            } else {
                console.log('❌ Error al obtener registros de Drive');
                resolve([]);
            }
            
            limpiarScript(script, callbackName);
        };
        
        script.onerror = function() {
            clearTimeout(timeout);
            console.log('❌ Error de conexión al obtener registros de Drive');
            resolve([]);
            limpiarScript(script, callbackName);
        };
        
        const params = new URLSearchParams({
            accion: 'listar',
            modulo: 'maquinarias',
            callback: callbackName
        });
        
        script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
        document.head.appendChild(script);
    });
}

// Limpiar script usado para JSONP
function limpiarScript(script, callbackName) {
    try {
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
        if (window[callbackName]) {
            delete window[callbackName];
        }
    } catch (error) {
        console.warn('Error al limpiar script:', error);
    }
}

// ========================================
// FUNCIONES PARA MANTENIMIENTOS
// ========================================

// Registrar mantenimiento en Google Drive
function registrarMantenimientoEnDrive(mantenimiento) {
    const callbackName = 'callback_mant_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            mostrarMensajeMantenimiento('✅ ¡Mantenimiento registrado correctamente!', 'success');
            cerrarModalMantenimiento();
            cargarMantenimientos();
        } else {
            console.log('❌ Error en Drive, guardando localmente');
            guardarMantenimientoLocal(mantenimiento);
        }
        
        limpiarScript(script, callbackName);
        resetearBotonMantenimiento();
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log('❌ Error de conexión, guardando localmente');
        guardarMantenimientoLocal(mantenimiento);
        limpiarScript(script, callbackName);
    };
    
    const params = new URLSearchParams({
        accion: 'registrar',
        modulo: 'mantenimientos',
        datos: JSON.stringify(mantenimiento),
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Editar mantenimiento en Google Drive
function editarMantenimientoEnDrive(id, mantenimiento) {
    const callbackName = 'callback_edit_mant_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            mostrarMensajeMantenimiento('✅ ¡Mantenimiento actualizado correctamente!', 'success');
            cerrarModalMantenimiento();
            cargarMantenimientos();
        } else {
            console.log('❌ Error en Drive, editando localmente');
            editarMantenimientoLocal(id, mantenimiento);
        }
        
        limpiarScript(script, callbackName);
        resetearBotonMantenimiento();
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log('❌ Error de conexión, editando localmente');
        editarMantenimientoLocal(id, mantenimiento);
        limpiarScript(script, callbackName);
    };
    
    const params = new URLSearchParams({
        accion: 'editar',
        modulo: 'mantenimientos',
        id: id,
        datos: JSON.stringify(mantenimiento),
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Eliminar mantenimiento en Google Drive
function eliminarMantenimientoEnDrive(id) {
    const callbackName = 'callback_delete_mant_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            mostrarMensajeMantenimiento('✅ Mantenimiento eliminado correctamente', 'success');
            cerrarModalConfirmarMantenimiento();
            cargarMantenimientos();
        } else {
            console.log('❌ Error en Drive, eliminando localmente');
            eliminarMantenimientoLocal(id);
        }
        
        limpiarScript(script, callbackName);
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log('❌ Error de conexión, eliminando localmente');
        eliminarMantenimientoLocal(id);
        limpiarScript(script, callbackName);
    };
    
    const params = new URLSearchParams({
        accion: 'eliminar',
        modulo: 'mantenimientos',
        id: id,
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Obtener mantenimientos de Google Drive
function obtenerMantenimientosDeDrive() {
    return new Promise((resolve) => {
        if (!hayInternet()) {
            resolve([]);
            return;
        }
        
        const callbackName = 'callback_listar_mant_' + Date.now();
        const script = document.createElement('script');
        
        const timeout = setTimeout(() => {
            script.onerror();
        }, 8000);
        
        window[callbackName] = function(data) {
            clearTimeout(timeout);
            
            if (data && data.success && data.registros) {
                console.log('📋 Mantenimientos obtenidos de Drive:', data.registros);
                resolve(data.registros);
            } else {
                console.log('❌ Error al obtener mantenimientos de Drive');
                resolve([]);
            }
            
            limpiarScript(script, callbackName);
        };
        
        script.onerror = function() {
            clearTimeout(timeout);
            console.log('❌ Error de conexión al obtener mantenimientos de Drive');
            resolve([]);
            limpiarScript(script, callbackName);
        };
        
        const params = new URLSearchParams({
            accion: 'listar',
            modulo: 'mantenimientos',
            callback: callbackName
        });
        
        script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
        document.head.appendChild(script);
    });
}

// ========================================
// FUNCIONES GENÉRICAS PARA OTROS MÓDULOS
// ========================================

// Registrar en cualquier módulo
function registrarEnModulo(modulo, datos) {
    const callbackName = 'callback_' + modulo + '_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        script.onerror();
    }, 8000);
    
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        
        if (data && data.success) {
            mostrarMensajeGenerico('✅ ¡Registro guardado correctamente!', 'success');
            cerrarModalGenerico();
            cargarRegistrosModulo(modulo);
        } else {
            console.log('❌ Error en Drive, guardando localmente');
            guardarLocalmenteModulo(modulo, datos);
        }
        
        limpiarScript(script, callbackName);
        resetearBotonGenerico();
    };
    
    script.onerror = function() {
        clearTimeout(timeout);
        console.log('❌ Error de conexión, guardando localmente');
        guardarLocalmenteModulo(modulo, datos);
        limpiarScript(script, callbackName);
    };
    
    const params = new URLSearchParams({
        accion: 'registrar',
        modulo: modulo,
        datos: JSON.stringify(datos),
        callback: callbackName
    });
    
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.head.appendChild(script);
}

// Obtener registros de cualquier módulo
function obtenerRegistrosModulo(modulo) {
    return new Promise((resolve) => {
        if (!hayInternet()) {
            resolve([]);
            return;
        }
        
        const callbackName = 'callback_listar_' + modulo + '_' + Date.now();
        const script = document.createElement('script');
        
        const timeout = setTimeout(() => {
            script.onerror();
        }, 8000);
        
        window[callbackName] = function(data) {
            clearTimeout(timeout);
            
            if (data && data.success && data.registros) {
                console.log(`📋 Registros de ${modulo} obtenidos:`, data.registros);
                resolve(data.registros);
            } else {
                console.log(`❌ Error al obtener registros de ${modulo}`);
                resolve([]);
            }
            
            limpiarScript(script, callbackName);
        };
        
        script.onerror = function() {
            clearTimeout(timeout);
            console.log(`❌ Error de conexión al obtener registros de ${modulo}`);
            resolve([]);
            limpiarScript(script, callbackName);
        };
        
        const params = new URLSearchParams({
            accion: 'listar',
            modulo: modulo,
            callback: callbackName
        });
        
        script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
        document.head.appendChild(script);
    });
}