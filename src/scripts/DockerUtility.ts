interface DockerData {
    root: HTMLElement;
    dockerTabs: HTMLElement;
    dockerContainer: HTMLElement;
    selectedTab: TabData;
}

interface TabData {
    tabLabel: HTMLElement;
    tabContainer: HTMLElement;
    currentDocker: DockerData;
}

interface WindowData {
    root: HTMLElement;
    header: HTMLElement;
    label: HTMLElement;
    container: HTMLElement;
}

var dockers: DockerData[] = [];
var selectedDocker: DockerData;
var selectedWindow: WindowData;

const dockerElements = document.getElementsByClassName('docker');
for (const docker of dockerElements) {
    AddDocker(docker as HTMLElement);
}

const viewport = document.getElementById('viewport');

export function RegisterWindow(root: HTMLElement) {
    const header = root.getElementsByClassName('window-header').item(0) as HTMLElement;
    header.addEventListener("mousedown", () => {
        selectedWindow = {
            root: root,
            header: header,
            label: root.getElementsByClassName('window-label').item(0) as HTMLElement,
            container: root.getElementsByClassName('window-container').item(0) as HTMLElement
        };

        document.addEventListener("mouseup", (e) => {
            CheckDockers(e);
            if (selectedDocker)
                DockSelectedWindow();
        }, { once: true })
    })
}

function DockSelectedWindow() {
    const docker = selectedDocker;
    const windowData = selectedWindow;

    const dockerTab = document.createElement('div')
    const tabData: TabData = { tabLabel: dockerTab, tabContainer: windowData.container, currentDocker: docker }

    dockerTab.draggable = true;
    dockerTab.addEventListener('click', () => {
        const selectedTab = tabData.currentDocker.selectedTab;
        if (selectedTab != null) {
            selectedTab.tabLabel.classList.remove('docker-tab-selected');
            selectedTab.tabContainer.style.display = 'none'
        }

        tabData.currentDocker.selectedTab = tabData;

        tabData.tabLabel.classList.add('docker-tab-selected');
        tabData.tabContainer.style.display = 'flex';
    })

    dockerTab.addEventListener('dragend', (e) => {
        CheckDockers(e);
        console.log(selectedDocker)
        if (tabData.currentDocker == selectedDocker)
            return;

        if (selectedDocker) {
            AddTabToDocker(tabData);
        } else {
            CreateWindowFromTab(tabData, windowData, e);
        }
    })

    dockerTab.innerHTML = selectedWindow.label.innerHTML;
    dockerTab.classList.add('docker-tab', 'unselectable');

    docker.dockerTabs.append(dockerTab);
    if (docker.dockerTabs.children.length != 1) {
        windowData.container.style.display = 'none';
    }
    else {
        dockerTab.classList.add('docker-tab-selected')
        docker.selectedTab = { tabLabel: dockerTab, tabContainer: windowData.container, currentDocker: docker }
    }

    windowData.container.classList.add('window-container-docked')
    docker.dockerContainer.append(windowData.container)
    selectedWindow.root.style.visibility = 'hidden'
}

function AddTabToDocker(tab: TabData) {
    tab.tabLabel.classList.remove('docker-tab-selected')
    tab.tabContainer.style.display = 'none'
    if (tab.currentDocker.selectedTab == tab) {
        tab.currentDocker.selectedTab = null;
    }
    tab.currentDocker = selectedDocker;

    selectedDocker.dockerTabs.append(tab.tabLabel);
    selectedDocker.dockerContainer.append(tab.tabContainer);
}

function CreateWindowFromTab(tab: TabData, window: WindowData, e: MouseEvent) {
    tab.tabLabel.remove();
    tab.tabContainer.style.display = 'flex'
    tab.tabContainer.classList.remove('window-container-docked')

    window.label.innerHTML = tab.tabLabel.innerHTML;
    window.root.append(tab.tabContainer)
    window.root.style.left = e.clientX - window.root.clientWidth / 2 + 'px';
    window.root.style.top =  e.clientY - window.header.clientHeight / 2 + 'px';


    window.root.style.visibility = 'visible';
}

function AddDocker(docker: HTMLElement) {
    const dockerTabs = docker.getElementsByClassName('docker-tabs').item(0) as HTMLElement;
    const dockerContainer = docker.getElementsByClassName('docker-container').item(0) as HTMLElement;
    const dockerResizer = docker.getElementsByClassName('docker-resizer').item(0) as HTMLElement;

    dockerResizer.addEventListener('mousedown', () => document.addEventListener('mousemove', ResizeDocker))
    document.addEventListener('mouseup', () => document.removeEventListener('mousemove', ResizeDocker))
    const direction = dockerResizer.classList.contains('right') ? 1 : -1;

    const dockerData: DockerData = {
        root: docker,
        dockerTabs: dockerTabs,
        dockerContainer: dockerContainer,
        selectedTab: null,
    };

    function ResizeDocker(e: MouseEvent) {
        docker.style.width = (docker.clientWidth + e.movementX * direction) + 'px';
    }

    dockers.push(dockerData)
}

function CheckDockers(e: MouseEvent) {
    for (const docker of dockers) {
        const offsetLeft = docker.root.offsetLeft + viewport.offsetLeft;
        const offsetTop = docker.root.offsetTop + viewport.offsetTop - docker.root.offsetHeight / 2;

        if (e.clientX < offsetLeft || e.clientX > offsetLeft + docker.root.offsetWidth) {
            selectedDocker = null;
            continue;
        }

        if (e.clientY < offsetTop || e.clientY > offsetTop + docker.root.offsetHeight) {
            selectedDocker = null;
            continue;
        }

        selectedDocker = docker;
        return;
    }
};