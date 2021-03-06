import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { BsModalRef, BsModalService, ModalModule } from 'ngx-bootstrap/modal';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';

import {
  configureTestBed,
  i18nProviders,
  PermissionHelper
} from '../../../../../testing/unit-test-helper';
import { PrometheusService } from '../../../../shared/api/prometheus.service';
import { CriticalConfirmationModalComponent } from '../../../../shared/components/critical-confirmation-modal/critical-confirmation-modal.component';
import { TableActionsComponent } from '../../../../shared/datatable/table-actions/table-actions.component';
import { NotificationType } from '../../../../shared/enum/notification-type.enum';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SharedModule } from '../../../../shared/shared.module';
import { PrometheusTabsComponent } from '../prometheus-tabs/prometheus-tabs.component';
import { SilenceListComponent } from './silence-list.component';

describe('SilenceListComponent', () => {
  let component: SilenceListComponent;
  let fixture: ComponentFixture<SilenceListComponent>;
  let prometheusService: PrometheusService;

  configureTestBed({
    imports: [
      SharedModule,
      BsDropdownModule.forRoot(),
      TabsModule.forRoot(),
      ModalModule.forRoot(),
      ToastrModule.forRoot(),
      RouterTestingModule,
      HttpClientTestingModule
    ],
    declarations: [SilenceListComponent, PrometheusTabsComponent],
    providers: [i18nProviders]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SilenceListComponent);
    component = fixture.componentInstance;
    prometheusService = TestBed.get(PrometheusService);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should test all TableActions combinations', () => {
    const permissionHelper: PermissionHelper = new PermissionHelper(component.permission);
    const tableActions: TableActionsComponent = permissionHelper.setPermissionsAndGetActions(
      component.tableActions
    );

    expect(tableActions).toEqual({
      'create,update,delete': {
        actions: ['Create', 'Recreate', 'Edit', 'Expire'],
        primary: { multiple: 'Create', executing: 'Edit', single: 'Edit', no: 'Create' }
      },
      'create,update': {
        actions: ['Create', 'Recreate', 'Edit'],
        primary: { multiple: 'Create', executing: 'Edit', single: 'Edit', no: 'Create' }
      },
      'create,delete': {
        actions: ['Create', 'Recreate', 'Expire'],
        primary: { multiple: 'Create', executing: 'Expire', single: 'Expire', no: 'Create' }
      },
      create: {
        actions: ['Create', 'Recreate'],
        primary: { multiple: 'Create', executing: 'Create', single: 'Create', no: 'Create' }
      },
      'update,delete': {
        actions: ['Edit', 'Expire'],
        primary: { multiple: 'Edit', executing: 'Edit', single: 'Edit', no: 'Edit' }
      },
      update: {
        actions: ['Edit'],
        primary: { multiple: 'Edit', executing: 'Edit', single: 'Edit', no: 'Edit' }
      },
      delete: {
        actions: ['Expire'],
        primary: { multiple: 'Expire', executing: 'Expire', single: 'Expire', no: 'Expire' }
      },
      'no-permissions': {
        actions: [],
        primary: { multiple: '', executing: '', single: '', no: '' }
      }
    });
  });

  describe('expire silence', () => {
    const setSelectedSilence = (silenceName: string) => {
      component.selection.selected = [{ id: silenceName }];
      component.selection.update();
    };

    const expireSilence = () => {
      component.expireSilence();
      const deletion: CriticalConfirmationModalComponent = component.modalRef.content;
      deletion.modalRef = new BsModalRef();
      deletion.ngOnInit();
      deletion.callSubmitAction();
    };

    const expectSilenceToExpire = (silenceId) => {
      setSelectedSilence(silenceId);
      expireSilence();
      expect(prometheusService.expireSilence).toHaveBeenCalledWith(silenceId);
    };

    beforeEach(() => {
      const mockObservable = () => of([]);
      spyOn(component, 'refresh').and.callFake(mockObservable);
      spyOn(prometheusService, 'expireSilence').and.callFake(mockObservable);
      spyOn(TestBed.get(BsModalService), 'show').and.callFake((deletionClass, config) => {
        return {
          content: Object.assign(new deletionClass(), config.initialState)
        };
      });
    });

    it('should expire a silence', () => {
      const notificationService = TestBed.get(NotificationService);
      spyOn(notificationService, 'show').and.stub();
      expectSilenceToExpire('someSilenceId');
      expect(notificationService.show).toHaveBeenCalledWith(
        NotificationType.success,
        'Expired Silence someSilenceId',
        undefined,
        undefined,
        'Prometheus'
      );
    });

    it('should refresh after expiring a silence', () => {
      expectSilenceToExpire('someId');
      expect(component.refresh).toHaveBeenCalledTimes(1);
      expectSilenceToExpire('someOtherId');
      expect(component.refresh).toHaveBeenCalledTimes(2);
    });
  });
});
