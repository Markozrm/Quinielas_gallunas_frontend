import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MenuComponent } from '../menu/menu.component';
import { UsersService } from '../services/users.service';
import { QuinielaService } from '../services/quiniela.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // AGREGAR ESTE IMPORT
import { environment } from '../../environments/environment'; // AGREGAR ESTE IMPORT


@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  standalone:true,
  imports:[MenuComponent,CommonModule,NgIf,FormsModule],
})
export class AdminComponent {
  constructor(
    private router: Router,
    private usersService: UsersService,
    private route: ActivatedRoute,
    private quinielaService: QuinielaService,
    private http: HttpClient // AGREGAR ESTE PARÁMETRO
  ) 
  {}
  irChats()
  {
    this.router.navigate([`/Panel`]);
  }
  irRegistro(){
    this.router.navigate(['/Register']);
  }
  irUsuarios(){
    this.router.navigate(['/Usuarios']);
  }
  irIniciarStream(){
    this.router.navigate(['/IniciarStream']);
  }

  irVideos(){
    this.router.navigate(['/Videos']);
  }
  irPM2(){
    this.router.navigate(['/Reiniciar']);
  }
  irRecibos(){
    this.router.navigate(['/Ver-recibos']);
  }
  irRetiros() {
    this.router.navigate(['/ver-retiros']);
  }
  irApuestas() {
    this.router.navigate(['/Ver-apuestas']);
  }
  irScreenshots() {
  this.router.navigate(['/Screenshots']);
  }
  irHistorialSaldos() {
    this.router.navigate(['/historial-saldos']);
  }
   irRuletaAdmin() {
    this.router.navigate(['/admin/ruleta']);
  }
  
  isSidebarOpen = false;
  username: string = localStorage.getItem('nombreUsuario') ?? '';
  userPhoto: string = this.getImage(this.username);

  // Propiedades para el casino admin
  isCasinoAdminOpen = false;
  showRifaPanel = false;
  modalGanadorAdminOpen = false;
  rifasAdmin: any[] = [];
  rifaSeleccionadaAdmin: any = null;
  loadingRifasAdmin = false;
  nuevaRifa = {
    numeroRifa: null,
    cantidadNumeros: 70,
    precioNumero: 10,
    sala: 'global'
  };

  // Streams disponibles - REMOVIDO
  // streamSeleccionado = '';
  // streamsDisponibles = ['Stream 1', 'Stream 2'];

  public getImage(username: string): any {

    return this.usersService.getImageUrl(username);
  }


  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    // Puedes agregar lógica para cerrar la sesión aquí si es necesario
  }
  logout() {
    // Lógica para cerrar sesión, por ejemplo, limpiar tokens y redirigir a la página de inicio de sesión.
    // Aquí también puedes agregar la lógica para limpiar cualquier otro dato que necesites.
    localStorage.removeItem('tokenLogin');
    localStorage.removeItem('nombreUsuario');

    // Navigate to the dynamic route based on the 'user' parameter

    this.router.navigate([`Login`]);
    // Otra lógica de cierre de sesión que puedas necesitar...
  }
  inicio(){
    this.router.navigate([`/`]);
  }
  isSuperAdmin(){
    const rol = localStorage.getItem("Rol") || "";

    const esSuperAdmin = rol === 'superUsuario';

    return esSuperAdmin;
  }
  isControladorBanca(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    return rol === 'controladorBanca';
  }

  // Métodos para el casino admin
  abrirCasinoAdmin() {
    this.isCasinoAdminOpen = true;
  }

  cerrarCasinoAdmin() {
    this.isCasinoAdminOpen = false;
    this.showRifaPanel = false;
    this.rifasAdmin = [];
  }

  irRifaAdmin() {
    this.showRifaPanel = true;
    this.cargarRifasAdmin();
  }
  irQuinielaAdmin() {
    this.cerrarCasinoAdmin();
    this.router.navigate(['/admin/quiniela']);
  }

  irVentajaAdmin() {
    this.cerrarCasinoAdmin();
    this.router.navigate(['/admin/ventaja']);
  }

  volverAlMenu() {
    this.showRifaPanel = false;
  }

  // Métodos de stream removidos
  // seleccionarStream(stream: string) {
  //   this.streamSeleccionado = stream;
  //   this.nuevaRifa.stream = stream;
  // }

  // esStreamSeleccionado(stream: string): boolean {
  //   return this.streamSeleccionado === stream;
  // }

  cargarRifasAdmin() {
    this.loadingRifasAdmin = true;
    console.log('Cargando rifas admin...');
    
    this.quinielaService.obtenerTodasLasRifas().subscribe({
      next: (data: any) => {
        console.log('Rifas cargadas:', data);
        // 1. Guardamos la lista para la vista del admin (esto ya lo haces y está bien).
        this.rifasAdmin = data;

        // 2. SOLUCIÓN: Informamos al servicio de la nueva lista completa.
        this.quinielaService.actualizarListaRifas(data);

        this.loadingRifasAdmin = false;
      },
      error: (error) => {
        console.error('Error al cargar rifas:', error);
        this.loadingRifasAdmin = false;
      }
    });
  }

  crearRifa() {
    const numeroRifa = Number(this.nuevaRifa.numeroRifa);
    const cantidadNumeros = Number(this.nuevaRifa.cantidadNumeros);
    const precioNumero = Number(this.nuevaRifa.precioNumero);

    if (!numeroRifa || !cantidadNumeros || !precioNumero) {
      alert('Por favor completa todos los campos con valores válidos');
      return;
    }

    const rifaData = {
      nombre: `Rifa ${numeroRifa}`, // Campo obligatorio
      numeroRifa: numeroRifa,
      cantidadNumeros: cantidadNumeros,
      precioNumero: precioNumero,
      sala: this.nuevaRifa.sala,
      tipo: 'rifa' // Campo adicional para diferenciar en backend
    };

    console.log('Datos de la rifa a enviar:', rifaData);

    this.quinielaService.crearRifa(rifaData).subscribe({ // Cambiado a quinielaService
      next: () => {
        alert('Quiniela creada exitosamente');
        this.cargarRifasAdmin();
        this.resetNuevaRifa();
      },
      error: (err: any) => {
        console.error('Error al crear quiniela:', err);
        alert(err.error?.error || 'Error al crear la quiniela');
      }
    });
  }

  resetNuevaRifa() {
    this.nuevaRifa = {
      numeroRifa: null,
      cantidadNumeros: 70,
      precioNumero: 10,
      sala: 'global'
    };
  }

  cerrarVentasRifa(rifa: any) {
  this.quinielaService.cerrarVentas(rifa.numeroRifa).subscribe({
    next: () => {
      alert('Ventas cerradas');
      this.cargarRifasAdmin();
    },
    error: (error) => alert('Error al cerrar ventas: ' + error.message)
  });
}


  abrirVentasRifa(rifa: any) {
    this.quinielaService.abrirVentas(rifa.numeroRifa).subscribe({ // Cambiado a quinielaService
      next: () => {
        alert('Ventas abiertas');
        this.cargarRifasAdmin();
      },
      error: () => alert('Error al abrir ventas')
    });
  }
  abrirSeleccionarGanadorAdmin(rifa: any) {
    this.rifaSeleccionadaAdmin = rifa;
    this.modalGanadorAdminOpen = true;
  }

  cerrarModalGanadorAdmin() {
    this.modalGanadorAdminOpen = false;
    this.rifaSeleccionadaAdmin = null;
  }

 // MÉTODO CORREGIDO
 seleccionarGanadorAdmin(rifa: any, numeroGanador: number) {
    console.log('Seleccionando ganador:', { rifa: rifa.numeroRifa, numeroGanador });

    if (!rifa.room) {
      alert('Error: La rifa seleccionada no tiene una sala asignada.');
      return;
    }

    // 1. Establecemos la sala para que el servicio sepa dónde escuchar la respuesta.
    this.quinielaService.setRoom(rifa.room);
    
    // 2. LLAMADA ACTUALIZADA: Pasamos el ID de la rifa ('rifa.numeroRifa') como primer argumento.
    this.quinielaService.seleccionarGanador(rifa.numeroRifa, numeroGanador, this.isSuperAdmin()).subscribe({
      next: (response) => {
        console.log('Ganador seleccionado:', response);
        alert(`¡Ganador seleccionado! ${response.ganador.username} con número ${response.ganador.numero}`);
        this.cargarRifasAdmin();
        this.cerrarModalGanadorAdmin();
      },
      // --- INICIO DE LA CORRECCIÓN ---
      error: (error) => {
        console.error('Error al seleccionar ganador:', error);
        
        // Lógica de error robusta
        let mensaje: string;
        if (typeof error === 'string') {
          // Si el error es un simple texto, lo usamos directamente.
          mensaje = error;
        } else {
          // Si es un objeto, intentamos buscar el mensaje dentro.
          mensaje = error.error?.error || error.message || 'Error desconocido';
        }
        
        alert(`Error al seleccionar ganador: ${mensaje}`);
      }
      // --- FIN DE LA CORRECCIÓN ---
    });
  }

  eliminarRifa(rifa: any) {
    if (confirm(`¿Estás seguro de eliminar la rifa #${rifa.numeroRifa}?`)) {
      this.quinielaService.eliminarRifa(rifa.numeroRifa).subscribe({ // Cambado a quinielaService
        next: () => {
          alert('Rifa eliminada');
          this.cargarRifasAdmin();
        },
        error: () => alert('Error al eliminar rifa')
      });
    }
  }

  getNumerosVendidosAdmin(rifa: any) {
    return Object.entries(rifa.numerosVendidos || {}).map(([numero, username]) => ({
      numero,
      username
    }));
  }

  getNumeroVendidosCount(rifa: any) {
    return Object.keys(rifa.numerosVendidos || {}).length;
  }
  // Añade este método en tu AdminComponent
getTotalRecaudado(rifa: any): number {
  const numerosVendidos = this.getNumeroVendidosCount(rifa);
  return numerosVendidos * (rifa.precioNumero || 0);
}

 // Propiedades necesarias:
isImagenStreamModalOpen = false;
imagenStreamUrl: string | null = null;

irImagenStream() {
  this.isImagenStreamModalOpen = true;
}

cerrarImagenStreamModal() {
  this.isImagenStreamModalOpen = false;
}

onImagenSeleccionada(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagenStreamUrl = e.target.result;
      localStorage.setItem('imagenStreamUrlAdmin', this.imagenStreamUrl!);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

subirImagenStream() {
  if (this.imagenStreamUrl) {
    const formData = new FormData();
    
    // Convertir base64 a blob
    if (this.imagenStreamUrl.startsWith('data:')) {
      const base64Data = this.imagenStreamUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      formData.append('file', blob, `stream-overlay-${Date.now()}.png`);
    }
    
    formData.append('tituloStream', 'Imagen Overlay Stream');

    // USAR RUTA OVERLAY (NO setClave):
    this.http.post(`http://localhost:444/api/streams/setImagenOverlay/1`, formData).subscribe({
      next: (response: any) => {
        console.log('Imagen overlay subida:', response);
        alert('✅ Imagen enviada al stream de apuestas');
        this.cerrarImagenStreamModal();
      },
      error: (error: any) => {
        console.error('Error subiendo imagen overlay:', error);
        alert('❌ Error al subir imagen overlay: ' + error.message);
      }
    });
  } else {
    alert('⚠️ Por favor selecciona una imagen primero');
  }
}

resetearImagenStream() {
  // USAR RUTA OVERLAY PARA QUITAR:
  this.http.post(`http://localhost:444/api/streams/removeImagenOverlay/1`, {}).subscribe({
    next: (response: any) => {
      console.log('Imagen overlay removida:', response);
      this.imagenStreamUrl = null;
      localStorage.removeItem('imagenStreamUrlAdmin');
      alert('✅ Imagen removida del stream de apuestas');
      this.cerrarImagenStreamModal();
    },
    error: (error: any) => {
      console.error('Error removiendo imagen overlay:', error);
      alert('❌ Error al remover imagen overlay: ' + error.message);
    }
  });
}

// Al iniciar el componente, recupera la imagen si existe
ngOnInit(): void {
  const savedImage = localStorage.getItem('imagenStreamUrlAdmin');
  if (savedImage) {
    this.imagenStreamUrl = savedImage;
  }
}
}
interface rifaData {
    numeroRifa: number;
    nombre: string;
    cantidadNumeros: number;
    precioNumero: number;
    sala: string;
    // otras propiedades si las hay
}
//Prueba de commit