interface DockerData {
    root: HTMLElement;
    width: number;
    height: number;
    //Top Left of the element
    position: {
        x: number,
        y: number
    };
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

export function RegisterWindow(root: HTMLElement, header: HTMLElement) {
    header.addEventListener("mousedown", () => {
        selectedWindow = {
            root: root,
            header: header,
            label: header.getElementsByClassName('window-label').item(0) as HTMLElement,
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
        width: docker.offsetWidth,
        height: docker.offsetHeight,
        position: { x: docker.offsetLeft, y: docker.offsetTop },
        dockerTabs: dockerTabs,
        dockerContainer: dockerContainer,
        selectedTab: null,
    };
    function ResizeDocker(e: MouseEvent) {
        const width = docker.clientWidth;
        dockerData.position.x = docker.offsetLeft
        dockerData.width = docker.clientWidth
        docker.style.width = (width + e.movementX * direction) + 'px';
    }


    dockers.push(dockerData)

    console.log(dockers)
}

function RemoveDocker(docker: HTMLElement) {
    var index = -1;

    for (var i = 0; i < dockers.length; i++) {
        if (dockers[i].root == docker) {
            index = i;
            break;
        }
    }

    if (index == -1)
        return;

    const root = dockers[index].root;
    dockers.splice(index, 1);
    root.remove();
}

function CheckDockers(e: MouseEvent) {
    console.log(dockers)
    for (const docker of dockers) {
        if (e.clientX < docker.position.x || e.clientX > docker.position.x + docker.width) {
            selectedDocker = null;
            continue;
        }

        if (e.clientY < docker.position.y || e.clientY > docker.position.y + docker.height) {
            selectedDocker = null;
            continue;
        }

        selectedDocker = docker;
        return;
    }
};