using CapNote.Core.Models;
using CommunityToolkit.Mvvm.ComponentModel;

namespace CapNote.App.ViewModels;

public partial class NoteItemViewModel(NoteItem model, Action changed) : ObservableObject
{
    public NoteItem Model { get; } = model;
    public string Id => Model.Id;
    public string Text { get => Model.Text; set { if (Model.Text == value) return; Model.Text = value; OnPropertyChanged(); changed(); } }
    public bool IsCompleted { get => Model.IsCompleted; set { if (Model.IsCompleted == value) return; Model.IsCompleted = value; OnPropertyChanged(); changed(); } }
}
