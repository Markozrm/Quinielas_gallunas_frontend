import { Component ,OnInit} from '@angular/core';
import { UsersService } from '../services/users.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  public saldoTotal: number = 0; // Nueva propiedad para el saldo global
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  paginatedUsers: any[] = [];
  
  // Expose Math for template use
  Math = Math;
  
  conceptoSaldo: string = '';
  
  constructor(private userService: UsersService,private router:Router) { }

  ngOnInit(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = this.sortUsersAlphabetically(users);
      this.filteredUsers = this.users; // Inicializa filteredUsers con todos los usuarios
      this.calcularSaldoTotal(); // Calcula el saldo total al cargar los usuarios
      this.updatePagination();
    });
  }
  
  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.updatePaginatedUsers();
  }
  
  updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedUsers();
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedUsers();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedUsers();
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

   // Nueva función para calcular el saldo total
  private calcularSaldoTotal(): void {
  this.saldoTotal = this.users.reduce((total, user) => {
    // Excluir al usuario con username "BANCA"
    if (user.username !== 'BANCA') {
      return total + (user.saldo || 0);
    }else{
      console.log("saldo de BANCA: ",user.saldo);
    }
    return total;
  }, 0);
}


  // Función para filtrar usuarios
  filterUsers(): void {
    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.sortUsers();
    this.currentPage = 1; // Reset to first page when filtering
    this.updatePagination();
  }

  // Función para ordenar usuarios según el criterio seleccionado
  sortUsers(): void {
    switch (this.sortOrder) {
      case 'highToLow':
        this.filteredUsers = [...this.filteredUsers].sort((a, b) => b.saldo - a.saldo);
        break;
      case 'lowToHigh':
        this.filteredUsers = [...this.filteredUsers].sort((a, b) => a.saldo - b.saldo);
        break;
      default:
        this.filteredUsers = this.sortUsersAlphabetically([...this.filteredUsers]);
        break;
    }
    this.updatePagination();
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
    // Llama a tu servicio para guardar los cambios en el usuario
    if (this.image != null) {
      this.userService.editUserImage(user._id, this.editedUser,this.image).subscribe(() => {
        this.editingUser = null;
          this.userService.getUsers().subscribe(users => {
            this.users = users;
            this.filteredUsers = this.users;
            this.calcularSaldoTotal();
            this.updatePagination();
          });
          alert("Usuario actualizado!");
      });
    }
    else{
    this.userService.editUser(user._id, this.editedUser).subscribe(() => {
      this.editingUser = null;
        this.userService.getUsers().subscribe(users => {
          this.users = users;
          this.filteredUsers = this.users;
          this.calcularSaldoTotal();
          this.updatePagination();
        });
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
        this.userService.getUsers().subscribe(users => {
          this.users = users;
          this.filteredUsers = this.users;
          this.calcularSaldoTotal();
          this.updatePagination();
        });
        alert("Usuario desbaneado!");
      });
    }
    else{
      this.userService.banUser(user.username).subscribe(() => {
        this.userService.getUsers().subscribe(users => {
          this.users = users;
          this.filteredUsers = this.users;
          this.calcularSaldoTotal();
          this.updatePagination();
        });
        alert("Usuario baneado!");
      });
    }

  }
  async eliminarUsuario(user:any){

      this.userService.deleteUser(user.username).subscribe(() => {
        alert("usuario eliminado");
        this.userService.getUsers().subscribe(users => this.users = users);
        
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
        this.userService.getUsers().subscribe(users => {
          this.users = users;
          this.filteredUsers = this.users;
          this.calcularSaldoTotal();
          this.updatePagination();
        });
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
  }

  closeSaldoModal(): void {
    this.showSaldoModal = false;
    this.selectedUser = null;
    this.saldoAmount = 0;
  }

  addSaldo(): void {
    if (this.selectedUser && this.saldoAmount > 0) {
      if (!this.conceptoSaldo.trim()) {
        this.conceptoSaldo = "modificacion de saldo por admin";
      }
      this.userService.updateSaldo(this.selectedUser.username, this.saldoAmount, this.conceptoSaldo, "modificacion_admin")
        .then((result) => {
          alert(`Saldo actualizado. Nuevo saldo: ${result.user.saldo}`);
          this.userService.getUsers().subscribe(users => {
            this.users = users;
            this.filterUsers(); // Aplicar filtro y ordenamiento actual
            this.calcularSaldoTotal(); // Actualiza el saldo total después de modificar
          });
          this.closeSaldoModal();
        })
        .catch(error => {
          alert(`Error al actualizar el saldo: ${error.message}`);
        });
    } else {
      alert("La cantidad debe ser mayor que 0");
    }
  }

  subtractSaldo(): void {
    if (this.selectedUser && this.saldoAmount > 0) {
      if (this.selectedUser.saldo < this.saldoAmount) {
        alert("El usuario no tiene suficiente saldo");
        return;
      }
      if (!this.conceptoSaldo.trim()) {
        alert('Debes ingresar un concepto para la modificación de saldo.');
        return;
      }
      this.userService.restarSaldo(this.selectedUser.username, this.saldoAmount, this.conceptoSaldo)
        .then((result) => {
          alert(`Saldo actualizado. Nuevo saldo: ${result.user.saldo}`);
          this.userService.getUsers().subscribe(users => {
            this.users = users;
            this.filterUsers(); // Aplicar filtro y ordenamiento actual
            this.calcularSaldoTotal(); // Calcula el saldo total al cargar los usuarios
          });
          this.closeSaldoModal();
        })
        .catch(error => {
          alert(`Error al actualizar el saldo: ${error.message}`);
        });
    } else {
      alert("La cantidad debe ser mayor que 0");
    }
  }
  verHistorial(user: any): void {
    this.router.navigate([`/historial-usuario/${user.username}`]);
  }
}
