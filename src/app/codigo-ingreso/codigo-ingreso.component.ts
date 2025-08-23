import { Component } from '@angular/core';
import { MenuComponent } from '../menu/menu.component';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '../services/users.service'; // Asegúrate de importar el servicio

@Component({
  selector: 'app-codigo-ingreso',
  templateUrl: './codigo-ingreso.component.html',
  styleUrls: ['./codigo-ingreso.component.css'],
  standalone: true,
  imports: [MenuComponent, ReactiveFormsModule]
})
export class CodigoIngresoComponent {
  email: string = '';
  codigoForm: FormGroup;

  constructor(private route: ActivatedRoute, private router: Router, private userService: UsersService) {
    this.codigoForm = new FormGroup({
      codigo: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)])
    });

    this.route.params.subscribe(params => {
      this.email = params['email'] || '';
    });
  }

  async onSubmit() {
    const codigo = this.codigoForm.get('codigo')?.value;
    const response = await this.userService.verificarCodigo(this.email, codigo);
    if (response.success) {
      alert('Código correcto, acceso permitido');
      this.router.navigate(['/live-inv', 'Stream1', '440']); // <-- Redirige aquí
    } else {
      alert(response.error || 'Código incorrecto');
    }
  }
}
