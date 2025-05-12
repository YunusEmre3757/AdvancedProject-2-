import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Il, Ilce, Mahalle, Adres, AdresRequest } from '../models/address.interface';

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private readonly apiUrl = environment.apiUrl + '/adres';

  constructor(private http: HttpClient) {}

  getAllIller(): Observable<Il[]> {
    return this.http.get<Il[]>(`${this.apiUrl}/iller`);
  }

  getIlcelerByIl(ilId: number): Observable<Ilce[]> {
    return this.http.get<Ilce[]>(`${this.apiUrl}/ilceler/${ilId}`);
  }

  getMahallelerByIlce(ilceId: number): Observable<Mahalle[]> {
    return this.http.get<Mahalle[]>(`${this.apiUrl}/mahalleler/${ilceId}`);
  }

  getUserAdresleri(userId: number): Observable<Adres[]> {
    return this.http.get<Adres[]>(`${this.apiUrl}/user/${userId}`);
  }

  addAdres(userId: number, request: AdresRequest): Observable<any> {
    console.log(`Adres isteği gönderiliyor: ${userId} için`);
    return this.http.post(`${this.apiUrl}/user/${userId}`, request);
  }

  deleteAdres(userId: number, adresId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/${userId}/${adresId}`);
  }

  setDefaultAddress(userId: number, adresId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/${userId}/${adresId}/default`, {});
  }
} 