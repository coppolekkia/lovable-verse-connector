import { useState, useEffect } from "react";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";
import CodeEditor from "@/components/CodeEditor";
import PreviewPanel from "@/components/PreviewPanel";
import SettingsModal from "@/components/SettingsModal";
import ProjectManager from "@/components/ProjectManager";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseProjects, SupabaseProject } from "@/hooks/useSupabaseProjects";
import { toast } from "sonner";
import ProjectTemplates from "@/components/ProjectTemplates";
import CollaborationPanel from "@/components/CollaborationPanel";
import AIAssistantPanel from "@/components/AIAssistantPanel";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandPalette from "@/components/CommandPalette";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import StatusBar from "@/components/StatusBar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const Index = () => {
  const [devMode, setDevMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [selectedProject, setSelectedProject] = useState<SupabaseProject | undefined>();
  const [showProjectManager, setShowProjectManager] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { projects, createProject, updateProject, loading: projectsLoading } = useSupabaseProjects();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>();
  const [buildStatus, setBuildStatus] = useState<'success' | 'error' | 'building'>('success');

  useEffect(() => {
    if (!authLoading && user && projects.length > 0 && !selectedProject) {
      setShowProjectManager(true);
    } else if (!authLoading && !user) {
      setShowProjectManager(false);
    }
  }, [authLoading, user, projects, selectedProject]);

  const handleToggleDevMode = () => {
    setDevMode(!devMode);
    toast.success(devMode ? "Modalità normale attivata" : "Modalità sviluppatore attivata");
  };

  const handleShare = () => {
    if (selectedProject) {
      const shareUrl = `${window.location.origin}/project/${selectedProject.id}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link di condivisione copiato negli appunti!");
    } else {
      toast.error("Seleziona un progetto per condividerlo");
    }
  };

  const handleCodeGenerated = (code: string) => {
    setCurrentCode(code);
    if (selectedProject && user) {
      updateProject(selectedProject.id, { code })
        .catch(error => console.error('Error auto-saving project:', error));
    }
  };

  const handleCodeChange = (code: string) => {
    setBuildStatus('building');
    setCurrentCode(code);
    
    if (selectedProject && user) {
      const timeoutId = setTimeout(() => {
        updateProject(selectedProject.id, { code })
          .then(() => {
            setLastSaved(new Date());
            setBuildStatus('success');
          })
          .catch(() => setBuildStatus('error'));
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleProjectSelect = (project: SupabaseProject) => {
    setSelectedProject(project);
    setCurrentCode(project.code);
    setShowProjectManager(false);
    setShowTemplates(false);
    toast.success(`Progetto "${project.name}" caricato`);
  };

  const handleSelectTemplate = async (template: any) => {
    if (user) {
      try {
        console.log('Creating project from template:', template.name);
        const newProject = await createProject(template.name, template.description);
        console.log('Project created:', newProject);
        
        await updateProject(newProject.id, { code: template.code });
        console.log('Template code applied');
        
        const updatedProject: SupabaseProject = { 
          ...newProject, 
          code: template.code 
        };
        
        handleProjectSelect(updatedProject);
        toast.success(`Progetto "${template.name}" creato da template`);
      } catch (error) {
        console.error('Error creating project from template:', error);
        toast.error("Errore nella creazione del progetto da template");
      }
    }
  };

  const handleNewProject = () => {
    console.log('Starting new project flow');
    setShowTemplates(true);
    setShowProjectManager(false);
  };

  const handleBackToProjects = () => {
    setSelectedProject(undefined);
    setCurrentCode('');
    setShowProjectManager(true);
    setShowTemplates(false);
  };

  const handleCancelTemplateSelection = () => {
    console.log('Template selection cancelled');
    setShowTemplates(false);
    setShowProjectManager(true);
  };
  
  const isOwner = !!(selectedProject && user && selectedProject.user_id === user.uid);
  const isProjectView = user && selectedProject;
  const showLandingPage = !user && !authLoading;

  // Keyboard shortcuts setup
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => setShowCommandPalette(true),
      description: 'Apri palette comandi'
    },
    {
      key: '/',
      ctrl: true,
      action: () => setShowShortcutsHelp(true),
      description: 'Mostra shortcuts'
    }
  ]);

  // Event listeners for global shortcuts
  useEffect(() => {
    const handleOpenCommandPalette = () => setShowCommandPalette(true);
    const handleToggleDevMode = () => handleToggleDevMode();
    const handleSaveProject = () => {
      if (selectedProject && user && currentCode !== selectedProject.code) {
        updateProject(selectedProject.id, { code: currentCode });
        setLastSaved(new Date());
        toast.success('Progetto salvato');
      }
    };
    const handleNewProject = () => handleNewProject();
    const handleToggleShortcutsHelp = () => setShowShortcutsHelp(prev => !prev);

    window.addEventListener('openCommandPalette', handleOpenCommandPalette);
    window.addEventListener('toggleDevMode', handleToggleDevMode);
    window.addEventListener('saveProject', handleSaveProject);
    window.addEventListener('newProject', handleNewProject);
    window.addEventListener('toggleShortcutsHelp', handleToggleShortcutsHelp);

    return () => {
      window.removeEventListener('openCommandPalette', handleOpenCommandPalette);
      window.removeEventListener('toggleDevMode', handleToggleDevMode);
      window.removeEventListener('saveProject', handleSaveProject);
      window.removeEventListener('newProject', handleNewProject);
      window.removeEventListener('toggleShortcutsHelp', handleToggleShortcutsHelp);
    };
  }, [selectedProject, user, currentCode, updateProject]);

  const handleCommandPaletteAction = (command: string, args?: any) => {
    switch (command) {
      case 'newProject':
        handleNewProject();
        break;
      case 'saveProject':
        if (selectedProject && user) {
          updateProject(selectedProject.id, { code: currentCode });
          setLastSaved(new Date());
          toast.success('Progetto salvato');
        }
        break;
      case 'shareProject':
        handleShare();
        break;
      case 'exportProject':
        // This will be handled by Header component
        break;
      case 'toggleDevMode':
        handleToggleDevMode();
        break;
      case 'openVersionHistory':
        // This will be handled by Header component
        break;
      case 'toggleAIAssistant':
        setShowAIAssistant(!showAIAssistant);
        break;
      case 'openSettings':
        setSettingsOpen(true);
        break;
    }
  };

  // Auto-save with status update
  const handleCodeChangeWithStatus = (code: string) => {
    setBuildStatus('building');
    setCurrentCode(code);
    
    if (selectedProject && user) {
      const timeoutId = setTimeout(() => {
        updateProject(selectedProject.id, { code })
          .then(() => {
            setLastSaved(new Date());
            setBuildStatus('success');
          })
          .catch(() => setBuildStatus('error'));
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  console.log('Current state:', {
    showLandingPage,
    showProjectManager,
    showTemplates,
    isProjectView,
    user: !!user,
    authLoading
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header
        onToggleDevMode={handleToggleDevMode}
        devMode={devMode}
        onShare={handleShare}
        onSettings={() => setSettingsOpen(true)}
        currentProject={selectedProject}
        onLogoClick={handleBackToProjects}
        currentCode={currentCode}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {showLandingPage ? (
          <div className="flex-1 flex items-center justify-center">
             <h1 className="text-4xl font-bold">Benvenuto! Accedi per iniziare.</h1>
          </div>
        ) : showTemplates ? (
          <div className="flex-1">
            <ProjectTemplates
              onSelectTemplate={handleSelectTemplate}
              onCancel={handleCancelTemplateSelection}
            />
          </div>
        ) : !isProjectView || showProjectManager ? (
          <div className="flex-1 p-6">
            <ProjectManager 
              onProjectSelect={handleProjectSelect}
              selectedProject={selectedProject}
              onNewProject={handleNewProject}
            />
          </div>
        ) : (
          <>
            <div className="w-1/3 border-r bg-white">
              <ChatInterface onCodeGenerated={handleCodeGenerated} />
            </div>
            <div className="flex-1">
              {devMode ? (
                <CodeEditor 
                  code={currentCode} 
                  onCodeChange={handleCodeChange}
                />
              ) : (
                <PreviewPanel code={currentCode} />
              )}
            </div>
            <div className="w-1/3 border-l">
              {devMode ? (
                <PreviewPanel code={currentCode} />
              ) : showAIAssistant ? (
                <AIAssistantPanel 
                  currentCode={currentCode}
                  onApplySuggestion={(code) => {
                    setCurrentCode(prev => prev + '\n\n' + code);
                  }}
                />
              ) : (
                <CollaborationPanel 
                  projectId={selectedProject?.id}
                  isOwner={isOwner}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        isOnline={navigator.onLine}
        lastSaved={lastSaved}
        buildStatus={buildStatus}
        currentProject={selectedProject?.name}
      />

      {isProjectView && !showTemplates && (
        <Button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={() => setShowAIAssistant(!showAIAssistant)}
        >
          <Brain className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Modals */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onCommand={handleCommandPaletteAction}
      />

      <ShortcutsHelp
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
};

export default Index;
