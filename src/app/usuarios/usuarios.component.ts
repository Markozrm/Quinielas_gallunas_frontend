import { Component ,OnInit} from '@angular/core';
import { UsersService } from '../services/users.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RecipesService } from '../services/recipes.service'; // Agrega esta importación

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
  standalone: true,
  imports: [CommonModule,FormsModule]
})
export class UsuariosComponent implements OnInit {
  users: any[] = []; // Asegúrate de ajustar el tipo de datos según la estructura de tu modelo de usuario
  editingUser: any = null;
  editedUser: any = {};
  image: any = null;
  showDeleteModal: boolean = false;
  selectedUser: any = null;
  filteredUsers: any[] = [];
  searchTerm: string = '';
  sortOrder: string = 'default';
  showSaldoModal: boolean = false;
  saldoAmount: number = 0;
  public saldoTotal: number = 0;
  totalUsers: number = 0;
  private searchTimer: any;
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  paginatedUsers: any[] = [];
  
  // Expose Math for template use
  Math = Math;
  
  conceptoSaldo: string = '';
  
  mostrarEnHistorialRecibo: boolean = false; // NUEVO: para el checkbox
  streamSearch: string = '';
  usuariosPorStream: any[] = [];
  mostrandoPorStream: boolean = false;
  streamSeleccionado: string = '';
  fechaActual: string = '';
  soloUsuariosCredito: boolean = false;



  constructor(
    private userService: UsersService,
    private router: Router,
    private route: ActivatedRoute,
    private recipeService: RecipesService // NUEVO: inyecta el servicio de recibos
  ) { }
  ngOnInit(): void {
    this.loadUsers();
    this.loadSaldoTotal();
  }

  loadUsers(): void {
    this.userService.getUsers(this.currentPage, this.itemsPerPage, this.searchTerm, this.sortOrder)
      .subscribe((data) => {
        let lista = data?.users || [];
        if (this.soloUsuariosCredito) {
          lista = lista.filter((user: any) => !!user.creditoActivo);
        }
        this.users = lista;
        this.filteredUsers = lista;
        this.paginatedUsers = lista;
        this.totalUsers = data?.total || 0;
        this.totalPages = data?.pages || 1;
      });
  }

  loadSaldoTotal(): void {
    this.userService.getSaldoTotal().subscribe((data) => {
      this.saldoTotal = data?.total || 0;
    });
  }
  
  // Pagination methods
  updatePagination(): void {
    this.loadUsers();
  }
  
  updatePaginatedUsers(): void {
    this.loadUsers();
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }
  
  getPaginationArray(): number[] {
    const array = [];
    const maxPages = 5; // Show maximum 5 page numbers
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      array.push(i);
    }
    return array;
  }

  private calcularSaldoTotal(): void {
    this.loadSaldoTotal();
  }

  filterUsers(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadUsers();
    }, 300);
  }

  sortUsers(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  openEditMenu(user: any): void {
    this.editingUser = user;
    // Copia los valores del usuario para la edición
    this.editedUser = { ...user };
  }

  handleImageChange(event: any): void {
    const input = event.target;
    const file = input.files[0];
    this.image = input.files[0];
    // if (file) {
    //   const reader = new FileReader();
    //   reader.onload = () => {
    //     this.imagePreview = reader.result as string;
    //   };
    //   reader.readAsDataURL(file);
    // } else {
    //   this.imagePreview = null;
    // }
  }

  saveChanges(user: any): void {
  if (this.editedUser.newPassword && this.editedUser.newPassword.trim() !== '') {
    this.userService.adminChangePassword(user._id, this.editedUser.newPassword).subscribe({
      next: () => {
        this.guardarDatosUsuario(user);
      },
      error: (err: any) => {
        console.error('Error al cambiar contraseña:', err);
        alert('Error al cambiar la contraseña');
      }
    });
  } else {
    this.guardarDatosUsuario(user);
  }
}

private guardarDatosUsuario(user: any): void {
  if (this.image != null) {
    this.userService.editUserImage(user._id, this.editedUser, this.image).subscribe(() => {
      this.editingUser = null;
      this.image = null;
      this.loadUsers();
      this.loadSaldoTotal();
      alert("Usuario actualizado!");
    });
  } else {
    this.userService.editUser(user._id, this.editedUser).subscribe(() => {
      this.editingUser = null;
      this.loadUsers();
      this.loadSaldoTotal();
      alert("Usuario actualizado!");
    });
  }
}

  cancelEdit(): void {
    this.editingUser = null;
  }

  getImage(username: string): any {

    return this.userService.getImageUrl(username);
  }
  volver(){
    this.router.navigate([`/Admin`]);
  }

  private sortUsersAlphabetically(users: any[]): any[] {
    return users.sort((a, b) => {
      if (a.username.toLowerCase() < b.username.toLowerCase()) {
        return -1;
      }
      if (a.username.toLowerCase() > b.username.toLowerCase()) {
        return 1;
      }
      return 0;
    });
  }
  estadoBan(user:any) :String{
    if (user.rol === 'baneado'){
      return 'Desbanear'
    }
    else{
      return 'Banear'
    }
  }
  async banearUsuario(user:any){
    if (user.rol === 'baneado'){
      this.userService.desBanUser(user.username).subscribe(() => {
        this.loadUsers();
        alert("Usuario desbaneado!");
      });
    }
    else{
      this.userService.banUser(user.username).subscribe(() => {
        this.loadUsers();
        alert("Usuario baneado!");
      });
    }

  }
  async eliminarUsuario(user:any){

      this.userService.deleteUser(user.username).subscribe(() => {
        alert("usuario eliminado");
        this.loadUsers();
        this.loadSaldoTotal();
        
      });
  }
  openDeleteConfirm(user: any): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  confirmDelete(): void {
    if (this.selectedUser) {
      this.userService.deleteUser(this.selectedUser.username).subscribe(() => {
        alert("Usuario eliminado");
        this.loadUsers();
        this.loadSaldoTotal();
        this.closeDeleteModal();
      });
    }
  }

  // Métodos para el modal de saldo
  openSaldoModal(user: any): void {
    this.selectedUser = user;
    this.showSaldoModal = true;
    this.saldoAmount = 0;
    this.conceptoSaldo = '';
    this.mostrarEnHistorialRecibo = false;
  }

  closeSaldoModal(): void {
    this.showSaldoModal = false;
    this.selectedUser = null;
    this.saldoAmount = 0;
  }

  addSaldo(): void {
    console.log('addSaldo llamado');
    console.log('selectedUser:', this.selectedUser);
    console.log('saldoAmount:', this.saldoAmount);
    console.log('conceptoSaldo:', this.conceptoSaldo);
    const claveStream = this.getClaveStream();
    console.log('claveStream:', claveStream);

    if (this.selectedUser && this.saldoAmount > 0) {
      const concepto = this.conceptoSaldo?.trim() || '';
      // Elimina la validación de claveStream si no es obligatoria
      // if (!claveStream) { 
      //   console.log('Clave stream vacía, no se puede continuar');
      //   return; 
      // }
          // Detectar palabra clave "credito" en el concepto (insensible a mayúsculas/acentos)
      const conceptoNormalizado = concepto
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
        .toLowerCase();
      const esConceptoCredito = /\bcredito\b/.test(conceptoNormalizado);
      this.userService.updateSaldo(
        this.selectedUser.username,
        this.saldoAmount,
        concepto, 
        "modificacion_admin",
        claveStream // puede ir vacío si tu backend lo permite
      )

      .then(async (result) => {
          // Si el concepto contiene "credito" y el usuario aún no lo tiene activo,
        // activamos automáticamente la marca "Usuario con crédito".
        if (esConceptoCredito && !this.selectedUser.creditoActivo) {
          this.userService.toggleCredito(this.selectedUser.username, true).subscribe({
            next: () => {
              // Reflejar el cambio en memoria (el getUsers de abajo también lo refresca)
              this.selectedUser.creditoActivo = true;
              const idx = this.users.findIndex(u => u._id === this.selectedUser._id);
              if (idx !== -1) this.users[idx].creditoActivo = true;
            },
            error: (err) => {
              console.warn('No se pudo activar crédito automáticamente:', err);
            }
          });
        }

        console.log('Resultado updateSaldo:', result);
        if (this.mostrarEnHistorialRecibo) {
          console.log('Creando recibo manual...');
          await this.recipeService.createManualRecibo({
            username: this.selectedUser.username,
            monto: this.saldoAmount,
            banco: 'Manual',
            estado: 'aprobado',
            fecha: new Date(),
            concepto: concepto || 'Modificación manual',
          }).toPromise();
        }
        alert(`Saldo actualizado. Nuevo saldo: ${result.user.saldo}`);
        this.loadUsers();
        this.loadSaldoTotal();
        this.closeSaldoModal();
      })
      .catch(error => {
        console.error('Error en updateSaldo:', error);
        alert(`Error al actualizar el saldo: ${error.message}`);
      });
    } else {
      console.log('Condición no cumplida: selectedUser o saldoAmount <= 0');
      alert("La cantidad debe ser mayor que 0");
    }
  }

  subtractSaldo(): void {
    console.log('subtractSaldo llamado');
    console.log('selectedUser:', this.selectedUser);
    console.log('saldoAmount:', this.saldoAmount);
    console.log('conceptoSaldo:', this.conceptoSaldo);

    if (this.selectedUser && this.saldoAmount > 0) {
      if (this.selectedUser.saldo < this.saldoAmount) {
        console.log('Saldo insuficiente');
        alert("El usuario no tiene suficiente saldo");
        return;
      }
      if (!this.conceptoSaldo.trim()) {
        console.log('Concepto vacío');
        alert('Debes ingresar un concepto para la modificación de saldo.');
        return;
      }
      this.userService.restarSaldo(this.selectedUser.username, this.saldoAmount, this.conceptoSaldo)
        .then((result) => {
          console.log('Resultado restarSaldo:', result);
          alert(`Saldo actualizado. Nuevo saldo: ${result.user.saldo}`);
          this.loadUsers();
          this.loadSaldoTotal();
          this.closeSaldoModal();
        })
        .catch(error => {
          console.error('Error en restarSaldo:', error);
          alert(`Error al actualizar el saldo: ${error.message}`);
        });
    } else {
      console.log('Condición no cumplida: selectedUser o saldoAmount <= 0');
      alert("La cantidad debe ser mayor que 0");
    }
  }
  verHistorial(user: any): void {
    this.router.navigate([`/historial-usuario/${user.username}`]);
  }
  
 getClaveStream(): string {
  if (!this.streamSeleccionado || !this.fechaActual) return '';
  return `${this.streamSeleccionado}-${this.fechaActual}`;
}
// Activa/desactiva la marca "Usuario con crédito" para un usuario.
// El backend persiste el valor; aquí actualizamos el array local sin recargar todo.
toggleCreditoUsuario(user: any): void {
  const nuevoValor = !user.creditoActivo;
  this.userService.toggleCredito(user.username, nuevoValor).subscribe({
    next: (resp: any) => {
      // Actualizar localmente para reflejar el cambio sin volver a pedir todo
      user.creditoActivo = nuevoValor;
      const idx = this.users.findIndex(u => u._id === user._id);
      if (idx !== -1) this.users[idx].creditoActivo = nuevoValor;
      // Si el filtro de "solo crédito" está activo y se desactivó, refrescar lista
      if (this.soloUsuariosCredito) {
        this.filterUsers();}
      alert(nuevoValor ? '✅ Crédito activado' : '✅ Crédito desactivado');
    },
    error: (err) => {
      alert('❌ Error al actualizar crédito: ' + (err?.error?.error || err?.message || 'desconocido'));
    }
  });
}

// Activa/desactiva el filtro que muestra solo usuarios con crédito.
toggleFiltroSoloCredito(): void {
  this.soloUsuariosCredito = !this.soloUsuariosCredito;
  this.filterUsers();
}
}
