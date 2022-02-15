import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  Input,
  QueryList,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Offcanvas } from 'bootstrap';
import { switchMap, map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Configurable, ConfigurableService } from '../configurable/configurable.service';
import { ComponentConfig, ConfigService } from '../configuration/config.service';
import { TemplateNameDirective } from '../utils/template-name.directive';

export interface ConfiguratorContext {
  /** Object storing the configuration of the component */
  config: ComponentConfig;
  /** Register of all the components configurators  */
  configurators?: Record<string, TemplateRef<any>>;
  /** Context of the zone of the edited component */
  context?: Configurable;
  /** Callback that the configurator should call to update the configuration */
  configChanged: () => void;
};

@Component({
  selector: 'uib-configurator',
  templateUrl: './configurator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguratorComponent {
  // Capture configurator templates
  @ContentChildren(TemplateNameDirective)
  children: QueryList<TemplateNameDirective>;
  configurators: Record<string, TemplateRef<any>> = {};

  @ViewChild('offcanvas') offcanvasEl: ElementRef;
  offcanvas: Offcanvas;

  @Input() cssClasses = true;
  @Input() conditionalDisplay = true;

  edited$: Observable<ConfiguratorContext>;
  
  configuration: ComponentConfig[] = [];

  _showTree: boolean;

  constructor(
    private cdr: ChangeDetectorRef,
    public configurableService: ConfigurableService,
    public configService: ConfigService
  ) {
    
    this.edited$ = configurableService.watchEdited().pipe(
      tap(() => this.offcanvas.show()),
      tap(() => this._showTree = false),
      switchMap((context) => 
        configService.watchConfig(context!.id).pipe(
          map(config => ({
            context,
            config,
            configurators: this.configurators,
            configChanged: () => this.configService.updateConfig(config)
          }))
        )
      )
    );
    
    // subscribe to configuration events
    this.configService.watchAllConfig().subscribe(config => {
      this.configuration = config;
      this.cdr.markForCheck();
    });
    
  }

  /**
   * Create Bootstrap OffCanvas component
   */
  ngAfterViewInit() {
    this.offcanvas = Offcanvas.getOrCreateInstance(this.offcanvasEl.nativeElement, {
      backdrop: false,
      scroll: true
    });
    this.offcanvasEl.nativeElement.addEventListener('hide.bs.offcanvas', _ => {
      this.configurableService.stopEditing();
    });
  }

  /**
   * Extract list of configuration editors
   */
  ngAfterContentInit() {
    this.children.forEach(
      tpl => (this.configurators[tpl.templateName] = tpl.template)
    );
  }
  
  flexChanges(edited: ConfiguratorContext, flex: any) {
    edited.config.classes = Object.keys(flex).map(k => flex[k]).join(' ');
    this.configService.updateConfig(edited.config);
  }

  showTree(showTree = true) {
    this._showTree = showTree;
  }

}
