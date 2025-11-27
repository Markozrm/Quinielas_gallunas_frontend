import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { TablaService } from '../services/tabla.service';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-tabla-puntos',
  templateUrl: './tabla-puntos.component.html',
  styleUrls: ['./tabla-puntos.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TablaPuntosComponent implements OnInit, OnDestroy {
  @Input() isSuperUser: boolean = false;

  title: string = 'TABLA DE PUNTOS';
  modalOpen = false;
  fechaActual = new Date();

  filas = Array.from({ length: 23 }, (_, i) => i + 1);
  rondas = Array.from({ length: 9 }, (_, i) => i + 1);

  tablaData: string[][] = []; // datos de celdas (opcional)
  private subs: Subscription[] = [];
  private pollTitleSub?: Subscription;
  private pollDataSub?: Subscription;
  private tablaSub?: Subscription;

  // --- NUEVAS PROPIEDADES ADMIN (no rompen la lógica existente) ---
  public adminRowsCount: number = 9;     // visible filas (3..9)
  public adminColsCount: number = 9;     // visible columnas numéricas (1..150)
  public selectedPaint: 'red' | 'green' | null = 'red';
  // cellColors[rowIndex (1-based)][colIndex (1-based)] = 'red'|'green'|undefined
  public cellColors: Record<number, Record<number, 'red' | 'green'>> = {};

  // marcas adicionales (X / T) por celda
  public cellMarks: Record<number, Record<number, 'X' | 'T'>> = {};
  // herramienta seleccionada: red | green | x | t
  public selectedTool: 'red' | 'green' | 'x' | 't' | null = 'red';

  // --- NUEVAS PROPIEDADES SOLICITADAS (palenque, entrada, nombres de partido) ---
  public palenqueName: string = 'PALENQUE LEÓN';
  public entradaAmount: string = '$50,000.00';
  // nombres de partido por fila (1-based index): si vacío, mostramos "PARTIDO X"
  public partyNames: string[] = [];

  private _externalTablaListener = (ev: any) => {
    try {
      const d = ev?.detail;
      if (!d) return;
      // FILAS (en TS) -> 1..150
      if (typeof d.rows === 'number') {
        this.adminRowsCount = Math.max(1, Math.min(150, Number(d.rows)));
      }
      // COLUMNAS (en TS) -> 3..9
      if (typeof d.cols === 'number') {
        this.adminColsCount = Math.max(3, Math.min(9, Number(d.cols)));
      }
      if (d.cellColors) {
        this.cellColors = d.cellColors;
      }
      // Asegurar que las marcas X/T se apliquen desde eventos externos
      if (d.cellMarks && typeof d.cellMarks === 'object') {
        this.cellMarks = d.cellMarks;
      }
      if (d.tablaData && Array.isArray(d.tablaData)) {
        this.tablaData = d.tablaData;
      }
      if (d.palenqueName) this.palenqueName = d.palenqueName;
      if (d.entradaAmount) this.entradaAmount = d.entradaAmount;
      if (d.partyNames && Array.isArray(d.partyNames)) this.partyNames = d.partyNames;
      this.ensurePartyNamesLength();
    } catch (err) {
      console.error('[TablaPuntos] error procesando evento externo', err);
    }
  };

  constructor(private tablaService: TablaService) {}

  // Ahora totalCols incluye la columna extra "w"
  get totalCols(): number {
    return this.adminColsCount + 1; // columnas numéricas + columna 'w'
  }

  // Nuevo: array para iterar columnas en la plantilla (0-based index)
  get colsArray(): any[] {
    return Array.from({ length: this.totalCols });
  }

  // ----------------- Helpers para normalizar orientación (filas x columnas) -----------------
  /**
   * Normaliza tablaData de forma determinista:
   * - Siempre produce una matriz [adminRowsCount][adminColsCount]
   * - NO intenta adivinar/transponer; copia data[r][c] tal cual si existe
   */
  private normalizeTablaData(data: any[][] | undefined) {
    const rowsDesired = this.adminRowsCount;
    const colsDesired = this.totalCols; // usar totalCols (incluye 'w')

    const out = Array.from({ length: rowsDesired }, () => Array.from({ length: colsDesired }, () => ''));
    if (!Array.isArray(data) || data.length === 0) {
      this.tablaData = out;
      return;
    }

    for (let r = 0; r < Math.min(data.length, rowsDesired); r++) {
      for (let c = 0; c < Math.min((data[r] || []).length, colsDesired); c++) {
        const val = data[r][c];
        out[r][c] = (val === undefined || val === null) ? '' : String(val);
      }
    }
    this.tablaData = out;
  }

  // inicializa tabla vacía con la orientación correcta
  private initEmptyTabla() {
    this.tablaData = Array.from({ length: this.adminRowsCount }, () =>
      Array.from({ length: this.totalCols }, () => '')
    );
  }

  ngOnInit(): void {
    console.log('[TablaPuntos] init');

    // inicializar admin counts usando valores actuales si existen
    // FILAS (TS) => 1..150 ; COLUMNAS (TS) => 3..9
    this.adminRowsCount = Math.min(150, Math.max(1, Number(this.filas.length || 9)));
    this.adminColsCount = Math.min(9, Math.max(3, Number(this.rondas.length || 3)));

    // listener para actualizaciones emitidas por admin (en otros navegadores)
    document.addEventListener('tablaPuntosActualizada', this._externalTablaListener as EventListener);

    // cargar título inicial
    const s1 = this.tablaService.getTitle().subscribe({
      next: resp => {
        if (resp?.title) this.title = resp.title;
      },
      error: err => console.warn('[TablaPuntos] getTitle error', err)
    });
    this.subs.push(s1);

    // cargar tabla inicial (si backend devuelve)
    const s2 = this.tablaService.getTabla().subscribe({
      next: resp => {
        // filas/cols del backend (cols = número de columnas numéricas)
        if (typeof resp?.rows === 'number') this.adminRowsCount = Math.max(1, Math.min(150, resp.rows));
        if (typeof resp?.cols === 'number') this.adminColsCount = Math.max(3, Math.min(9, resp.cols));

        // cargar palenque / entrada / partyNames / title / cellColors
        if (typeof resp?.palenqueName === 'string') this.palenqueName = resp.palenqueName;
        if (typeof resp?.entradaAmount === 'string') this.entradaAmount = resp.entradaAmount;
        if (typeof resp?.title === 'string') this.title = resp.title;
        if (resp?.cellColors) this.cellColors = resp.cellColors;
        // IMPORTANTE: cargar marcas X/T al iniciar
        if (resp?.cellMarks && typeof resp.cellMarks === 'object') {
          this.cellMarks = resp.cellMarks;
        }
        if (Array.isArray(resp?.partyNames)) this.partyNames = resp.partyNames.slice();
        this.ensurePartyNamesLength();

        // tablaData puede venir sin la columna 'w' — normalizeTablaData se encarga de adaptar tamaño
        this.normalizeTablaData(resp?.data);

      },
      error: err => {
        console.warn('[TablaPuntos] getTabla error', err);
        // inicializar si no hay datos
        this.ensurePartyNamesLength();
        if (!this.tablaData || this.tablaData.length === 0) this.initEmptyTabla();
      }
    });
    this.subs.push(s2);

    // actualizar fecha cada minuto
    this.pollTitleSub = interval(3000).subscribe(() => {
      // polling del título (simula "tiempo real" simple)
      this.tablaService.getTitle().subscribe({
        next: resp => {
          if (resp?.title && resp.title !== this.title) {
            this.title = resp.title;
          }
        },
        error: () => {}
      });
      // mantener fecha actualizada
      this.fechaActual = new Date();
    });

    // opcional: poll de datos cada 10s
    this.pollDataSub = interval(10000).subscribe(() => {
      this.tablaService.getTabla().subscribe({
        next: resp => {
          if (resp?.data && Array.isArray(resp.data)) this.normalizeTablaData(resp.data);
          // si el backend trae cellMarks en el poll, aplicarlas también
          if (resp?.cellMarks && typeof resp.cellMarks === 'object') {
            this.cellMarks = resp.cellMarks;
          }
        },
        error: () => {}
      });
    });

    // Suscribirse a actualizaciones en tiempo real (socket) para sincronizar cellMarks y demás
    this.tablaSub = this.tablaService.onTablaUpdates().subscribe((payload: any) => {
      if (!payload) return;
      if (payload.tablaData) this.tablaData = payload.tablaData;
      if (payload.cellColors) this.cellColors = payload.cellColors;
      if (payload.cellMarks) this.cellMarks = payload.cellMarks;
      if (Array.isArray(payload.partyNames)) this.partyNames = payload.partyNames.slice();
      if (typeof payload.palenqueName === 'string') this.palenqueName = payload.palenqueName;
      if (typeof payload.entradaAmount === 'string') this.entradaAmount = payload.entradaAmount;
      // forzar update visual si hace falta
    });

    // Suscripción al socket (tiempo real) para aplicar cambios desde backend
    const sSocket = this.tablaService.onTablaUpdates().subscribe((payload: any) => {
      if (!payload) return;
      if (typeof payload.rows === 'number') {
        this.adminRowsCount = Math.max(1, Math.min(150, payload.rows));
      }
      if (typeof payload.cols === 'number') {
        this.adminColsCount = Math.max(3, Math.min(9, payload.cols));
      }
      if (payload.cellColors) this.cellColors = payload.cellColors;
      if (Array.isArray(payload.tablaData)) this.normalizeTablaData(payload.tablaData);
      if (payload.palenqueName) this.palenqueName = payload.palenqueName;
      if (payload.entradaAmount) this.entradaAmount = payload.entradaAmount;
      if (Array.isArray(payload.partyNames)) this.partyNames = payload.partyNames;
      if (payload.title) this.title = payload.title;
      this.ensurePartyNamesLength();
    });
    this.subs.push(sSocket);
  }

  // inicializa nombres de partido por defecto
  private initPartyNames() {
    this.partyNames = [];
    const rows = Math.max( (this.tablaData && this.tablaData.length) || 0, this.adminRowsCount );
    for (let i = 0; i < rows; i++) {
      this.partyNames[i] = this.partyNames[i] || `PARTIDO ${i + 1}`;
    }
    this.ensurePartyNamesLength();
  }

  private ensurePartyNamesLength() {
    while (this.partyNames.length < this.adminRowsCount) {
      this.partyNames.push('');
    }
    this.partyNames.length = Math.min(this.partyNames.length, this.adminRowsCount);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.pollTitleSub?.unsubscribe();
    this.pollDataSub?.unsubscribe();
    document.removeEventListener('tablaPuntosActualizada', this._externalTablaListener as EventListener);
    if (this.tablaSub) this.tablaSub.unsubscribe();
  }

  abrir() { this.modalOpen = true; }

  cerrar() { this.modalOpen = false; }

  editarTitle(nuevo: string) {
    if (!this.isSuperUser) return;
    this.title = nuevo;
    console.log('[TablaPuntos] setTitle ->', nuevo);
    this.tablaService.setTitle(nuevo).subscribe({
      next: () => console.log('[TablaPuntos] título guardado'),
      error: err => console.error('[TablaPuntos] error guardando título', err)
    });
  }

  // guardar tabla (ahora envía payload completo y backend emitter propagará a invitados)
  saveTabla() {
    if (!this.isSuperUser) return;
    const payload = {
      data: this.tablaData,
      rows: this.adminRowsCount,
      cols: this.adminColsCount, // backend espera cols (numéricas)
      cellColors: this.cellColors,
      // Incluir marcas X/T para no sobreescribir/omitirlas en el backend
      cellMarks: this.cellMarks,
      palenqueName: this.palenqueName,
      entradaAmount: this.entradaAmount,
      partyNames: this.partyNames,
      title: this.title
    };
    this.tablaService.saveTabla(payload).subscribe({
      next: () => console.log('[TablaPuntos] tabla guardada y emitida'),
      error: err => console.error('[TablaPuntos] error guardar tabla', err)
    });
  }

  // ----------------- MÉTODOS ADMIN (pintado y configuración) -----------------
  // Ajusta cantidad de filas (solo cambia filas horizontales) - límites 1..150
  setAdminRows(n: number) {
    const v = Math.max(1, Math.min(150, Math.floor(Number(n))));
    this.adminRowsCount = v;

    if (!Array.isArray(this.tablaData)) this.tablaData = [];
    while (this.tablaData.length < this.adminRowsCount) {
      this.tablaData.push(Array.from({ length: this.adminColsCount }, () => ''));
    }
    this.tablaData.length = Math.min(this.tablaData.length, this.adminRowsCount);

    this.ensurePartyNamesLength();
    this.emitAdminUpdate();
  }

  // Ajusta cantidad de columnas (solo cambia columnas por fila) - límites 3..9
  setAdminCols(n: number) {
    const v = Math.max(3, Math.min(9, Math.floor(Number(n))));
    this.adminColsCount = v;

    this.tablaData = (this.tablaData || []).map(row => {
      const r = Array.isArray(row) ? [...row] : [];
      while (r.length < this.adminColsCount) r.push('');
      if (r.length > this.adminColsCount) r.length = this.adminColsCount;
      return r;
    });

    if (!this.tablaData || this.tablaData.length === 0) {
      this.initEmptyTabla();
    }

    this.emitAdminUpdate();
  }

  // editar palenque y entrada (solo admin)
  setPalenqueName(n: string) {
    if (!this.isSuperUser) return;
    this.palenqueName = n;
    // no persistir aquí; se persiste al presionar Guardar y Emitir
  }
  setEntradaAmount(n: string) {
    if (!this.isSuperUser) return;
    this.entradaAmount = n;
    // no persistir aquí; se persiste al presionar Guardar y Emitir
  }

  // editar nombre de partido (1-based index)
  setPartyName(index1: number, name: string) {
    if (!this.isSuperUser) return;
    const idx = index1 - 1;
    this.ensurePartyNamesLength();
    this.partyNames[idx] = name;
    // cambios locales; se persisten solo con Guardar y Emitir
  }

  // Selecciona herramienta (red/green/X/T)
  setTool(t: 'red' | 'green' | 'x' | 't') {
    if (!this.isSuperUser) return;
    this.selectedTool = t;
  }

  // Alterna color o marca en una celda (fila y col son 1-based)
  toggleCellColor(row: number, col: number) {
    if (!this.isSuperUser) return;
    if (!this.selectedTool) return;
    if (col < 1 || col > this.totalCols) return;

    // herramienta color (red/green) - comportamiento existente sin cambios
    if (this.selectedTool === 'red' || this.selectedTool === 'green') {
      if (!this.cellColors[row]) this.cellColors[row] = {};
      const current = this.cellColors[row][col];
      if (current === this.selectedTool) {
        delete this.cellColors[row][col];
        if (Object.keys(this.cellColors[row]).length === 0) delete this.cellColors[row];
      } else {
        this.cellColors[row][col] = this.selectedTool;
      }
    } else {
      // herramienta marca X / T: ahora TOGGLE (si ya existe la misma marca, se quita)
      const mark = this.selectedTool === 'x' ? 'X' : 'T';
      if (!this.cellMarks[row]) this.cellMarks[row] = {};

      // Si la celda ya tiene la misma marca -> quitarla
      if (this.cellMarks[row][col] === mark) {
        delete this.cellMarks[row][col];
        // si no quedan marcas en la fila, eliminar el objeto para mantener limpio
        if (Object.keys(this.cellMarks[row]).length === 0) delete this.cellMarks[row];
      } else {
        // poner la marca (esto sobrescribe cualquier marca previa en esa celda)
        this.cellMarks[row][col] = mark;
      }
    }

    // actualizar UI localmente y avisar a listeners locales
    this.emitAdminUpdate();

    // Emitir en tiempo real al backend para que se propague a invitados inmediatamente.
    const payload = {
      data: this.tablaData,
      rows: this.adminRowsCount,
      cols: this.adminColsCount,
      cellColors: this.cellColors,
      cellMarks: this.cellMarks,
      palenqueName: this.palenqueName,
      entradaAmount: this.entradaAmount,
      partyNames: this.partyNames,
      title: this.title
    };
    try {
      this.tablaService.saveFullTabla(payload).subscribe({
        next: () => { /* emitido en backend */ },
        error: (err) => { console.warn('[TablaPuntos] error emitiendo cambio en tiempo real', err); }
      });
    } catch (err) {
      console.warn('[TablaPuntos] saveFullTabla no disponible o falló', err);
    }
  }

  // Emite CustomEvent con estado actual (rows, cols, cellColors y tablaData opcional)
  emitAdminUpdate() {
    const detail = {
       rows: this.adminRowsCount,
       cols: this.adminColsCount, // enviar cols numéricas; tablaData contiene la columna 'w' extra
       tablaData: this.tablaData,
       cellColors: this.cellColors,
       cellMarks: this.cellMarks,
       palenqueName: this.palenqueName,
       entradaAmount: this.entradaAmount,
       partyNames: this.partyNames,
       title: this.title
     };
    document.dispatchEvent(new CustomEvent('tablaPuntosActualizada', { detail }));
  }

  // Guarda tabla (llama a la función existente) y emite estado
  guardarAdminyEmitir() {
    if (!this.isSuperUser) return;

    const payload = {
      data: this.tablaData,
      rows: this.adminRowsCount,
      cols: this.adminColsCount, // backend espera cols (numéricas)
      cellColors: this.cellColors,
     cellMarks: this.cellMarks,
      palenqueName: this.palenqueName,
      entradaAmount: this.entradaAmount,
      partyNames: this.partyNames,
      title: this.title
    };

    // usar saveFullTabla para enviar todo tal cual y esperar confirmación
    this.tablaService.saveFullTabla(payload).subscribe({
      next: () => {
        // actualizamos local (por si backend ajustó algo) y emitimos para demás clientes
        this.emitAdminUpdate();
        alert('Tabla guardada y emitida en tiempo real.');
      },
      error: (err) => {
        console.error('[TablaPuntos] error guardando tabla', err);
        alert('Error al guardar la tabla en el servidor.');
      }
    });
  }

  // Formatea fecha en español: "Miércoles, 12 de Noviembre"
  getFechaFormateada(): string {
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const d = this.fechaActual;
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
  }

  // Limpia colores y contenido de celdas (partidos + números + W)
  clearAllColors() {
    if (!this.isSuperUser) return;
    if (!confirm('¿Limpiar colores y contenido de las celdas? Esta acción no se guardará hasta que pulses "Guardar y Emitir".')) return;

    // limpiar colores
    this.cellColors = {};
    // limpiar marcas X/T
    this.cellMarks = {};

    // limpiar nombres de partido (hasta adminRowsCount)
    for (let r = 0; r < this.adminRowsCount; r++) {
      this.partyNames[r] = '';
    }
    // asegurar longitud de tablaData y limpiar cada celda (incluye columna W en index adminColsCount)
    for (let r = 0; r < this.adminRowsCount; r++) {
      if (!Array.isArray(this.tablaData[r])) {
        this.tablaData[r] = Array.from({ length: this.adminColsCount + 1 }, () => '');
      } else {
        // limpiar columnas numéricas y la columna W
        for (let c = 0; c <= this.adminColsCount; c++) {
          this.tablaData[r][c] = '';
        }
      }
    }

    // emitir actualización local para refrescar UI
    this.emitAdminUpdate();
  }
}